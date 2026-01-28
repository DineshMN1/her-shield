'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Users } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function VideoCallPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.id as string;

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [appointment, setAppointment] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
  const [isInitializing, setIsInitializing] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const roomIdRef = useRef<string>('');

  // Initialize the call
  const initializeCall = useCallback(async () => {
    const token = localStorage.getItem('token');

    try {
      // Get appointment details
      const detailsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/appointments/${appointmentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const detailsData = await detailsRes.json();
      setAppointment(detailsData.appointment);

      // Create/get video room
      const videoRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/video/create/${appointmentId}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const videoData = await videoRes.json();
      roomIdRef.current = videoData.channel;

      // Initialize local media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Connect to WebSocket for signaling
      connectSocket(videoData.channel);
      setIsInitializing(false);
      toast.success('Video call initialized');
    } catch (error) {
      console.error('Failed to initialize call:', error);
      toast.error('Failed to start video call');
      setIsInitializing(false);
    }
  }, [appointmentId]);

  // WebSocket connection and signaling
  const connectSocket = (roomId: string) => {
    const wsUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const socket = io(wsUrl, {
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      // Join the video room
      socket.emit('join-room', { roomId, userId: user.id });
    });

    // Another user joined - create offer (we are the initiator)
    socket.on('user-joined', async ({ userId, socketId }) => {
      console.log('User joined:', userId);
      setParticipantCount((prev) => prev + 1);
      toast.success('Participant joined the call');

      // Create peer connection and send offer
      await createPeerConnection();
      try {
        const offer = await peerConnectionRef.current?.createOffer();
        await peerConnectionRef.current?.setLocalDescription(offer);
        socket.emit('webrtc-offer', { roomId, offer });
      } catch (err) {
        console.error('Error creating offer:', err);
      }
    });

    // Received offer - create answer
    socket.on('webrtc-offer', async ({ offer }) => {
      console.log('Received offer');

      await createPeerConnection();
      try {
        await peerConnectionRef.current?.setRemoteDescription(
          new RTCSessionDescription(offer)
        );
        const answer = await peerConnectionRef.current?.createAnswer();
        await peerConnectionRef.current?.setLocalDescription(answer);
        socket.emit('webrtc-answer', { roomId, answer });
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    });

    // Received answer
    socket.on('webrtc-answer', async ({ answer }) => {
      console.log('Received answer');
      try {
        await peerConnectionRef.current?.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      } catch (err) {
        console.error('Error handling answer:', err);
      }
    });

    // ICE candidate received
    socket.on('webrtc-ice-candidate', async ({ candidate }) => {
      if (candidate && peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    });

    // User left
    socket.on('user-left', () => {
      console.log('User left');
      setParticipantCount((prev) => Math.max(1, prev - 1));
      setIsConnected(false);
      toast.info('Participant left the call');

      // Clear remote video
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }

      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  };

  // Create RTCPeerConnection
  const createPeerConnection = async () => {
    if (peerConnectionRef.current) {
      return;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // Add local tracks
    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!);
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('webrtc-ice-candidate', {
          roomId: roomIdRef.current,
          candidate: event.candidate,
        });
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('Remote track received');
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setIsConnected(true);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setIsConnected(true);
      } else if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed'
      ) {
        setIsConnected(false);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
    };
  };

  // Initialize on mount
  useEffect(() => {
    initializeCall();

    return () => {
      cleanup();
    };
  }, [initializeCall]);

  // Cleanup function
  const cleanup = () => {
    // Stop local stream
    localStreamRef.current?.getTracks().forEach((track) => track.stop());

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Leave room and disconnect socket
    if (socketRef.current) {
      socketRef.current.emit('leave-room', { roomId: roomIdRef.current });
      socketRef.current.disconnect();
    }
  };

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsVideoOff(!isVideoOff);
  };

  const endCall = async () => {
    const token = localStorage.getItem('token');

    try {
      // Notify backend call ended
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/video/end/${appointmentId}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (error) {
      console.error('Error ending call:', error);
    }

    cleanup();
    toast.success('Call ended');
    router.push('/appointments');
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white">
              {appointment?.doctorName || 'Video Consultation'}
            </h2>
            <p className="text-gray-400 text-sm">
              {appointment?.specialty || 'Video Consultation'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-yellow-500'
              } animate-pulse`}
            ></div>
            <span className="text-white text-sm">
              {isConnected ? 'Connected' : 'Waiting...'}
            </span>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 relative">
        {/* Remote Video (Other participant) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover bg-gray-800"
        />

        {/* Loading/Waiting State */}
        {!isConnected && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-center">
              {isInitializing ? (
                <>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-white">Initializing video call...</p>
                </>
              ) : (
                <>
                  <div className="animate-pulse rounded-full h-12 w-12 border-2 border-white mx-auto mb-4 flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-white">Waiting for other participant to join...</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Share the appointment link with the other person
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Local Video - Picture in Picture */}
        <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden shadow-lg border-2 border-gray-700">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <VideoOff className="w-8 h-8 text-gray-500" />
            </div>
          )}
        </div>

        {/* Participant Info */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 px-4 py-2 rounded-lg">
          <div className="flex items-center space-x-2 text-white">
            <Users className="w-4 h-4" />
            <span className="text-sm">
              {participantCount} participant{participantCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 px-6 py-6">
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full transition-all ${
              isMuted
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-all ${
              isVideoOff
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isVideoOff ? (
              <VideoOff className="w-6 h-6 text-white" />
            ) : (
              <Video className="w-6 h-6 text-white" />
            )}
          </button>

          <button
            onClick={endCall}
            className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-all"
            title="End call"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>

          <button
            className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-all"
            title="Chat (coming soon)"
          >
            <MessageSquare className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
