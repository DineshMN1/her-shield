'use client';

import { useState, useEffect, useRef } from 'react';
import { Video, ArrowLeft, PhoneOff, Mic, MicOff, VideoOff, Users } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

function RemoteVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline className="w-full h-full object-contain bg-gray-900" />;
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
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  // 'unknown' | 'granted' | 'denied' | 'prompt'
  const [camPermission, setCamPermission] = useState<string>('unknown');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tracks the userId of whoever we're currently connected to
  const peerUserIdRef = useRef<string | null>(null);
  // Incoming ICE candidates buffered until remoteDescription is set
  const recvCandidateBuffer = useRef<RTCIceCandidateInit[]>([]);
  // Outgoing ICE candidates buffered until we know the peer's userId
  const sendCandidateBuffer = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSet = useRef(false);

  const tokenRef = useRef('');

  const isDoctor = currentUser?.role === 'DOCTOR';
  const isAdmin = currentUser?.role === 'ADMIN';

  const dashboardPath = isDoctor
    ? '/dashboard/doctor'
    : isAdmin
    ? '/dashboard/admin'
    : '/dashboard/mother';

  const otherPartyName = isDoctor ? appointment?.patientName : appointment?.doctorName;

  const rawName = currentUser
    ? `${currentUser.firstName} ${currentUser.lastName}`.trim()
    : 'Guest';
  // Guard against names already stored with "Dr." prefix in the DB
  const displayName = isDoctor && !rawName.startsWith('Dr.')
    ? `Dr. ${rawName}`
    : rawName;

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token') || '';
    tokenRef.current = token;
    if (userData) setCurrentUser(JSON.parse(userData));
    fetchAppointment(token);

    // Check camera permission state (Chrome/Firefox only — no error if unsupported)
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'camera' as PermissionName }).then((status) => {
        setCamPermission(status.state);
        status.onchange = () => setCamPermission(status.state);
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (inCall && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [inCall]);

  const fetchAppointment = async (token: string) => {
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
    try {
      await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${tokenRef.current}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
    } catch {}
  };

  const startCall = async () => {
    if (!currentUser || !appointment) return;
    setConnecting(true);

    // Reset all signaling state
    remoteDescSet.current = false;
    peerUserIdRef.current = null;
    recvCandidateBuffer.current = [];
    sendCandidateBuffer.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(ICE_CONFIG);
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (event.streams[0]) setRemoteStream(event.streams[0]);
      };

      const roomId = appointment.roomId || appointmentId;

      // Helper: post a signal directly to a known peer
      const postDirect = async (recipientId: string, type: string, payload: object) => {
        await fetch('/api/video-signal', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokenRef.current}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ roomId, recipientId, type, payload: JSON.stringify(payload) }),
        });
      };

      // Helper: broadcast to anyone in the room (offer + initiator ICE candidates)
      const postBroadcast = async (type: string, payload: object) => {
        await fetch('/api/video-signal', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokenRef.current}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ roomId, recipientId: null, type, payload: JSON.stringify(payload) }),
        });
      };

      // When peer's userId is known, flush any buffered outgoing ICE candidates
      const flushSendBuffer = (peerId: string) => {
        const buffered = sendCandidateBuffer.current.splice(0);
        buffered.forEach((c) => postDirect(peerId, 'candidate', c));
      };

      pc.onicecandidate = ({ candidate }) => {
        if (!candidate) return;
        if (peerUserIdRef.current) {
          postDirect(peerUserIdRef.current, 'candidate', candidate.toJSON());
        } else {
          // Peer not known yet (we're the initiator, waiting for the answer)
          sendCandidateBuffer.current.push(candidate.toJSON());
        }
      };

      // Patient is ALWAYS the initiator — admin/doctor are always the responders.
      // This ensures exactly one offer is broadcast per call regardless of join order.
      const isPatient = currentUser.id === appointment.patientId;

      if (isPatient) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await postBroadcast('offer', offer);
      }

      setConnecting(false);
      setInCall(true);
      updateStatus('IN_PROGRESS');

      // Poll DB every 1.5 s for signals in this room addressed to me
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(
            `/api/video-signal?roomId=${encodeURIComponent(roomId)}`,
            { headers: { Authorization: `Bearer ${tokenRef.current}` } }
          );
          const { signals = [] } = await res.json();

          for (const signal of signals) {
            // ── Received an offer (we are doctor / admin) ─────────────────
            if (signal.type === 'offer' && !isPatient && !remoteDescSet.current) {
              peerUserIdRef.current = signal.senderId;
              await pc.setRemoteDescription(
                new RTCSessionDescription(JSON.parse(signal.payload))
              );
              remoteDescSet.current = true;

              // Flush received ICE candidates that arrived before the offer
              for (const c of recvCandidateBuffer.current) {
                await pc.addIceCandidate(new RTCIceCandidate(c));
              }
              recvCandidateBuffer.current = [];

              // Create + send answer directly to the patient
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await postDirect(signal.senderId, 'answer', answer);

              // ICE candidates generated during createAnswer are now sent directly
              // (peerUserIdRef.current is already set above)
              flushSendBuffer(signal.senderId);

            // ── Received an answer (we are patient / initiator) ───────────
            } else if (signal.type === 'answer' && isPatient && !remoteDescSet.current) {
              peerUserIdRef.current = signal.senderId;
              await pc.setRemoteDescription(
                new RTCSessionDescription(JSON.parse(signal.payload))
              );
              remoteDescSet.current = true;

              for (const c of recvCandidateBuffer.current) {
                await pc.addIceCandidate(new RTCIceCandidate(c));
              }
              recvCandidateBuffer.current = [];

              // Send any ICE candidates that were buffered while waiting for the answer
              flushSendBuffer(signal.senderId);

            // ── ICE candidate from peer ───────────────────────────────────
            } else if (signal.type === 'candidate') {
              const candidate = JSON.parse(signal.payload);
              if (remoteDescSet.current) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } else {
                recvCandidateBuffer.current.push(candidate);
              }

            // ── Other party ended the call ────────────────────────────────
            } else if (signal.type === 'hangup') {
              cleanupCall();
              toast.info('The other party has ended the call');
              router.push(dashboardPath);
              return; // stop processing remaining signals
            }
          }
        } catch (err) {
          console.error('Signal poll error:', err);
        }
      }, 1500);

    } catch (err: any) {
      setConnecting(false);
      console.error('Start call error:', err.name, err.message, err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        // Permissions were denied — browser won't re-prompt after page reload
        toast.error(
          'Camera/microphone access was blocked. Click the camera icon in your browser address bar, allow access, then refresh the page.',
          { duration: 8000 }
        );
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        toast.error(
          'Camera or microphone is in use by another app (Teams, Zoom, etc.). Close those apps and try again.',
          { duration: 6000 }
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        toast.error('No camera or microphone found. Please connect a device and try again.');
      } else if (err.name === 'OverconstrainedError') {
        // Retry with audio-only video constraints as fallback
        toast.error('Camera resolution not supported. Try a different camera or browser.');
      } else if (err.name === 'SecurityError') {
        toast.error('Video calls require a secure connection (HTTPS). Please use the full site URL.');
      } else {
        toast.error(
          `Could not start call: ${err.message || err.name || 'unknown error'}. Try refreshing the page.`,
          { duration: 6000 }
        );
      }
    }
  };

  const cleanupCall = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setRemoteStream(null);
    setInCall(false);
    remoteDescSet.current = false;
    peerUserIdRef.current = null;
    recvCandidateBuffer.current = [];
    sendCandidateBuffer.current = [];
  };

  const endCall = async () => {
    const roomId = appointment?.roomId || appointmentId;

    // Notify the other party BEFORE cleanup so the signal still goes out
    if (peerUserIdRef.current) {
      fetch('/api/video-signal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenRef.current}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, recipientId: peerUserIdRef.current, type: 'hangup', payload: '{}' }),
      }).catch(() => {});
    }

    cleanupCall();

    fetch(`/api/video-signal?roomId=${encodeURIComponent(roomId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenRef.current}` },
    }).catch(() => {});

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

  return (
    // 100dvh accounts for mobile browser chrome (address bar) so no white gap
    <div className="bg-gray-900 flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
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
                  ? `${remoteStream ? '1 connected' : 'Waiting for other party…'} · ${displayName}`
                  : otherPartyName
                  ? `with ${otherPartyName}`
                  : 'Loading…'}
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

      {/* Main area: min-h-0 prevents flex overflow on short viewports */}
      <div className="flex-1 min-h-0 relative overflow-hidden bg-gray-900">
        {inCall ? (
          <>
            {/* Remote video — h-full fills the entire flex-1 container */}
            <div className="w-full h-full">
              {!remoteStream ? (
                <div className="flex items-center justify-center h-full bg-gray-800 m-4 rounded-2xl">
                  <div className="text-center">
                    <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-300 font-medium">Waiting for other party to join…</p>
                    <p className="text-gray-500 text-sm mt-1">They will connect automatically</p>
                  </div>
                </div>
              ) : (
                <RemoteVideo stream={remoteStream} />
              )}
            </div>

            {/* Local PiP — mirrored so it looks natural (like a mirror) */}
            <div className="absolute bottom-20 right-3 w-28 h-40 sm:w-36 sm:h-48 rounded-xl overflow-hidden shadow-xl border-2 border-gray-600 bg-gray-800">
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
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
          <div className="h-full overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-8">
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

            {camPermission === 'denied' ? (
              <div className="bg-red-900/40 border border-red-700 rounded-xl p-5 mb-8">
                <h3 className="text-red-400 font-semibold mb-1">Camera/microphone blocked</h3>
                <p className="text-red-300 text-sm mb-3">
                  Your browser has blocked access. Click the camera icon in the address bar,
                  set Camera &amp; Microphone to <strong>Allow</strong>, then reload this page.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg"
                >
                  Reload page
                </button>
              </div>
            ) : (
              <div className="bg-blue-900/30 border border-blue-800 rounded-xl p-5 mb-8">
                <h3 className="text-blue-400 font-semibold mb-2">Before you join</h3>
                <ul className="text-blue-300 text-sm space-y-1">
                  <li>• Allow camera &amp; microphone when the browser asks</li>
                  <li>• Ensure you&apos;re in a quiet, well-lit area</li>
                  <li>• The other party will connect automatically</li>
                </ul>
              </div>
            )}

            <button
              onClick={startCall}
              disabled={connecting || camPermission === 'denied'}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center space-x-3 transition-colors"
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

            <p className="text-center text-gray-500 text-sm mt-3 pb-4">
              End-to-end encrypted · peer-to-peer · no third-party servers
            </p>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
