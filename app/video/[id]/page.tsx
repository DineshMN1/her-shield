'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Video, ArrowLeft, PhoneOff, Mic, MicOff, VideoOff, Users } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';

// Deterministic peer ID from appointment + user IDs (alphanumeric only, max 36 chars)
function buildPeerId(appointmentId: string, userId: string) {
  const aid = appointmentId.replace(/-/g, '').slice(0, 14);
  const uid = userId.replace(/-/g, '').slice(0, 14);
  return `hs${aid}${uid}`;
}

function RemoteVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = stream; }, [stream]);
  return <video ref={ref} autoPlay playsInline className="w-full h-full object-cover bg-gray-800" />;
}

export default function VideoCallPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.id as string;

  const [appointment, setAppointment] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inCall, setInCall] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [peers, setPeers] = useState<Record<string, MediaStream>>({});
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<any>(null);
  const connectedIds = useRef<Set<string>>(new Set());
  const retryTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const isDoctor = currentUser?.role === 'DOCTOR';
  const isAdmin = currentUser?.role === 'ADMIN';

  const dashboardPath = isDoctor
    ? '/dashboard/doctor'
    : isAdmin
    ? '/dashboard/admin'
    : '/dashboard/mother';

  const otherPartyName = isDoctor
    ? appointment?.patientName
    : appointment?.doctorName;

  const displayName = currentUser
    ? isDoctor
      ? `Dr. ${currentUser.firstName} ${currentUser.lastName}`.trim()
      : `${currentUser.firstName} ${currentUser.lastName}`.trim()
    : 'Guest';

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setCurrentUser(JSON.parse(userData));
    fetchAppointmentDetails();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(retryTimers.current).forEach(clearTimeout);
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peerRef.current?.destroy();
    };
  }, []);

  // Attach local stream to the PiP video element once it mounts (inCall = true)
  useEffect(() => {
    if (inCall && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [inCall]);

  const fetchAppointmentDetails = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAppointment(data.appointment);
    } catch {
      toast.error('Failed to load appointment details');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch {}
  };

  const loadPeerJS = (): Promise<void> =>
    new Promise((resolve, reject) => {
      if ((window as any).Peer) { resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load video library'));
      document.head.appendChild(s);
    });

  const answerCall = useCallback((call: any, stream: MediaStream) => {
    call.answer(stream);
    call.on('stream', (remote: MediaStream) => {
      connectedIds.current.add(call.peer);
      setPeers((p) => ({ ...p, [call.peer]: remote }));
    });
    call.on('close', () => {
      connectedIds.current.delete(call.peer);
      setPeers((p) => { const n = { ...p }; delete n[call.peer]; return n; });
    });
  }, []);

  const callPeer = useCallback((remotePeerId: string, stream: MediaStream, attempt = 0) => {
    if (connectedIds.current.has(remotePeerId) || !peerRef.current) return;

    const call = peerRef.current.call(remotePeerId, stream);
    if (!call) return;

    call.on('stream', (remote: MediaStream) => {
      connectedIds.current.add(remotePeerId);
      clearTimeout(retryTimers.current[remotePeerId]);
      setPeers((p) => ({ ...p, [remotePeerId]: remote }));
    });

    call.on('close', () => {
      connectedIds.current.delete(remotePeerId);
      setPeers((p) => { const n = { ...p }; delete n[remotePeerId]; return n; });
    });

    // Retry if peer not available yet (up to 2 minutes)
    if (attempt < 24) {
      retryTimers.current[remotePeerId] = setTimeout(() => {
        if (!connectedIds.current.has(remotePeerId)) callPeer(remotePeerId, stream, attempt + 1);
      }, 5000);
    }
  }, []);

  const startCall = async () => {
    if (!currentUser || !appointment) return;
    setConnecting(true);

    try {
      await loadPeerJS();

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      // srcObject is set by the useEffect below once inCall=true renders the PiP element

      const myPeerId = buildPeerId(appointmentId, currentUser.id);

      // Everyone the current user should try to call
      const remotePeerIds: string[] = [];
      if (appointment.patientId && currentUser.id !== appointment.patientId)
        remotePeerIds.push(buildPeerId(appointmentId, appointment.patientId));
      if (appointment.doctorId && currentUser.id !== appointment.doctorId)
        remotePeerIds.push(buildPeerId(appointmentId, appointment.doctorId));

      const peer = new (window as any).Peer(myPeerId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            // Free TURN relay — replace with your own for production
            { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
          ],
        },
      });

      peerRef.current = peer;

      peer.on('open', () => {
        setConnecting(false);
        setInCall(true);
        updateStatus('IN_PROGRESS');
        remotePeerIds.forEach((id) => callPeer(id, stream));
      });

      // Answer ALL incoming calls (from doctor, patient, or admin)
      peer.on('call', (call: any) => answerCall(call, stream));

      peer.on('error', (err: any) => {
        if (err.type === 'unavailable-id') {
          // Peer ID still registered — wait and retry
          setTimeout(() => {
            peerRef.current?.destroy();
            startCall();
          }, 3000);
        } else if (err.type !== 'peer-unavailable') {
          console.error('Peer error:', err);
        }
      });
    } catch (err: any) {
      setConnecting(false);
      if (err.name === 'NotAllowedError') {
        toast.error('Camera/microphone permission denied. Please allow access and try again.');
      } else {
        toast.error('Failed to start video call.');
      }
    }
  };

  const endCall = async () => {
    Object.values(retryTimers.current).forEach(clearTimeout);
    retryTimers.current = {};
    connectedIds.current.clear();
    peerRef.current?.destroy();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setPeers({});
    setInCall(false);
    await updateStatus('COMPLETED');
    toast.success('Consultation completed');
    router.push(dashboardPath);
  };

  const toggleAudio = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setAudioMuted(!track.enabled); }
  };

  const toggleVideo = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setVideoOff(!track.enabled); }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500" />
      </div>
    );
  }

  const remoteEntries = Object.entries(peers);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {!inCall && (
              <Link href={dashboardPath}>
                <ArrowLeft className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer" />
              </Link>
            )}
            <div>
              <h1 className="text-white font-semibold">Video Consultation</h1>
              <p className="text-gray-400 text-sm">
                {inCall
                  ? `${remoteEntries.length > 0 ? remoteEntries.length + ' connected' : 'Waiting...'} · ${displayName}`
                  : otherPartyName
                  ? `with ${otherPartyName}`
                  : 'Loading...'}
              </p>
            </div>
          </div>
          {inCall && (
            <button
              onClick={endCall}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <PhoneOff className="w-4 h-4" />
              <span>End Call</span>
            </button>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 relative overflow-hidden bg-gray-900">
        {inCall ? (
          <>
            {/* Remote videos */}
            <div
              className={`w-full h-full grid gap-1 ${
                remoteEntries.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
              }`}
              style={{ height: 'calc(100vh - 130px)' }}
            >
              {remoteEntries.length === 0 ? (
                <div className="flex items-center justify-center m-4 bg-gray-800 rounded-2xl">
                  <div className="text-center">
                    <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-300 font-medium">Waiting for others to join…</p>
                    <p className="text-gray-500 text-sm mt-1">They will connect automatically</p>
                  </div>
                </div>
              ) : (
                remoteEntries.map(([id, stream]) => <RemoteVideo key={id} stream={stream} />)
              )}
            </div>

            {/* Local video (PiP) */}
            <div className="absolute bottom-20 right-3 w-28 h-40 sm:w-36 sm:h-48 rounded-xl overflow-hidden shadow-xl border-2 border-gray-600 bg-gray-800">
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              {videoOff && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <VideoOff className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <p className="absolute bottom-1 w-full text-center text-white text-xs drop-shadow">You</p>
            </div>

            {/* Controls */}
            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-5">
              <button
                onClick={toggleAudio}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
                  audioMuted ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {audioMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
              </button>

              <button
                onClick={endCall}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </button>

              <button
                onClick={toggleVideo}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
                  videoOff ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {videoOff ? <VideoOff className="w-5 h-5 text-white" /> : <Video className="w-5 h-5 text-white" />}
              </button>
            </div>
          </>
        ) : (
          /* Pre-call screen */
          <div className="max-w-2xl mx-auto px-4 py-12">
            <div className="text-center mb-8">
              <div className="bg-gray-800 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <Video className="w-12 h-12 text-pink-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Ready to Join?</h2>
              <p className="text-gray-400">Consultation with {otherPartyName}</p>
              <p className="text-gray-500 text-sm mt-1">
                Joining as: <span className="text-white font-medium">{displayName}</span>
              </p>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 mb-6">
              <h3 className="text-white font-semibold mb-4">Appointment Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Date</span>
                  <span className="text-white">
                    {appointment?.date &&
                      new Date(appointment.date).toLocaleDateString('en-IN', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                      })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Time</span>
                  <span className="text-white">{appointment?.time}</span>
                </div>
                {appointment?.reason && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Reason</span>
                    <span className="text-white">{appointment.reason}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-900/30 border border-blue-800 rounded-xl p-5 mb-8">
              <h3 className="text-blue-400 font-semibold mb-2">Before you join</h3>
              <ul className="text-blue-300 text-sm space-y-1">
                <li>• Allow camera &amp; microphone when the browser asks</li>
                <li>• Ensure you&apos;re in a quiet, well-lit area</li>
                <li>• Others will connect automatically — no sharing of links needed</li>
              </ul>
            </div>

            <button
              onClick={startCall}
              disabled={connecting}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center space-x-3 transition-colors"
            >
              {connecting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  <span>Connecting…</span>
                </>
              ) : (
                <>
                  <Video className="w-6 h-6" />
                  <span>Join Video Call</span>
                </>
              )}
            </button>

            <p className="text-center text-gray-500 text-sm mt-3">
              Peer-to-peer · encrypted · no login needed
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
