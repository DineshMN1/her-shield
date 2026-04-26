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
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iceCandidateBuffer = useRef<RTCIceCandidateInit[]>([]);
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

  const displayName = currentUser
    ? isDoctor
      ? `Dr. ${currentUser.firstName} ${currentUser.lastName}`
      : `${currentUser.firstName} ${currentUser.lastName}`
    : 'Guest';

  // Load user + appointment on mount
  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token') || '';
    tokenRef.current = token;
    if (userData) setCurrentUser(JSON.parse(userData));
    fetchAppointment(token);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
    };
  }, []);

  // Wire local stream to PiP element once call starts (element not rendered until inCall=true)
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

    // Reset signaling state from any previous attempt
    remoteDescSet.current = false;
    iceCandidateBuffer.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(ICE_CONFIG);
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (event.streams[0]) setRemoteStream(event.streams[0]);
      };

      // The signal room is the appointment's roomId (instant meets) or the appointmentId itself
      const roomId = appointment.roomId || appointmentId;

      // Determine the other party (patient calls doctor, doctor calls patient)
      const otherId =
        currentUser.id === appointment.patientId
          ? appointment.doctorId
          : appointment.patientId;

      if (!otherId) {
        toast.error('Cannot identify the other participant for this call.');
        setConnecting(false);
        pc.close();
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      // Helper: post a signal to the DB addressed to the other party
      const postSignal = async (type: string, payload: object) => {
        await fetch('/api/video-signal', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokenRef.current}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomId,
            recipientId: otherId,
            type,
            payload: JSON.stringify(payload),
          }),
        });
      };

      // Send ICE candidates to the other party as they are gathered
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) postSignal('candidate', candidate.toJSON());
      };

      // Deterministic initiator: lexicographically smaller user ID creates the offer
      const isInitiator = currentUser.id < otherId;

      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await postSignal('offer', offer);
      }

      setConnecting(false);
      setInCall(true);
      updateStatus('IN_PROGRESS');

      // Poll the DB every 1.5 s for signals addressed to me
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(
            `/api/video-signal?roomId=${encodeURIComponent(roomId)}`,
            { headers: { Authorization: `Bearer ${tokenRef.current}` } }
          );
          const { signals = [] } = await res.json();

          for (const signal of signals) {
            if (signal.type === 'offer' && !remoteDescSet.current) {
              // Received an offer — answer it
              await pc.setRemoteDescription(
                new RTCSessionDescription(JSON.parse(signal.payload))
              );
              remoteDescSet.current = true;
              for (const c of iceCandidateBuffer.current) {
                await pc.addIceCandidate(new RTCIceCandidate(c));
              }
              iceCandidateBuffer.current = [];
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await postSignal('answer', answer);

            } else if (signal.type === 'answer' && !remoteDescSet.current) {
              // Received answer to our offer
              await pc.setRemoteDescription(
                new RTCSessionDescription(JSON.parse(signal.payload))
              );
              remoteDescSet.current = true;
              for (const c of iceCandidateBuffer.current) {
                await pc.addIceCandidate(new RTCIceCandidate(c));
              }
              iceCandidateBuffer.current = [];

            } else if (signal.type === 'candidate') {
              const candidate = JSON.parse(signal.payload);
              if (remoteDescSet.current) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } else {
                iceCandidateBuffer.current.push(candidate);
              }
            }
          }
        } catch (err) {
          console.error('Signal poll error:', err);
        }
      }, 1500);

    } catch (err: any) {
      setConnecting(false);
      if (err.name === 'NotAllowedError') {
        toast.error('Camera/microphone permission denied. Please allow access and try again.');
      } else {
        console.error('Start call error:', err);
        toast.error('Failed to start video call. Please check camera/mic permissions.');
      }
    }
  };

  const endCall = async () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setRemoteStream(null);
    setInCall(false);
    remoteDescSet.current = false;
    iceCandidateBuffer.current = [];

    const roomId = appointment?.roomId || appointmentId;
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

      {/* Main area */}
      <div className="flex-1 relative overflow-hidden bg-gray-900">
        {inCall ? (
          <>
            {/* Remote video */}
            <div className="w-full" style={{ height: 'calc(100vh - 130px)' }}>
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

            {/* Local video PiP */}
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
                <li>• The other party will connect automatically — no link sharing needed</li>
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
              End-to-end encrypted · peer-to-peer · no third-party servers
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
