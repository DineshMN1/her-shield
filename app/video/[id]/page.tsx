'use client';

import { useState, useEffect, useRef } from 'react';
import { Video, ArrowLeft, PhoneOff } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';

const JITSI_DOMAIN = 'meet.jit.si';

export default function VideoCallPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.id as string;

  const [appointment, setAppointment] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inCall, setInCall] = useState(false);
  const jitsiApiRef = useRef<any>(null);

  const roomName = `HealthSOS${appointmentId.replace(/-/g, '')}`;
  const isDoctor = currentUser?.role === 'DOCTOR';

  // Don't manually prepend "Dr." — the DB may already store it in the name
  const otherPartyName = isDoctor
    ? appointment?.patientName
    : appointment?.doctorName;

  // Full name used inside the Jitsi room as the participant label
  const displayName = currentUser
    ? (isDoctor
        ? `Dr. ${currentUser.firstName} ${currentUser.lastName}`.trim()
        : `${currentUser.firstName} ${currentUser.lastName}`.trim())
    : 'Guest';

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setCurrentUser(JSON.parse(userData));
    fetchAppointmentDetails();
  }, []);

  // Use Jitsi External API — avoids X-Frame-Options / "refused to connect" issues
  useEffect(() => {
    if (!inCall) return;

    let api: any = null;

    const initJitsi = () => {
      const container = document.getElementById('jitsi-container');
      if (!container || !(window as any).JitsiMeetExternalAPI) return;

      api = new (window as any).JitsiMeetExternalAPI(JITSI_DOMAIN, {
        roomName,
        parentNode: container,
        userInfo: { displayName },
        configOverwrite: {
          prejoinPageEnabled: false,
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
        },
      });
      jitsiApiRef.current = api;
    };

    if ((window as any).JitsiMeetExternalAPI) {
      initJitsi();
    } else {
      // Avoid duplicate script injection
      if (!document.getElementById('jitsi-external-api')) {
        const script = document.createElement('script');
        script.id = 'jitsi-external-api';
        script.src = `https://${JITSI_DOMAIN}/external_api.js`;
        script.onload = initJitsi;
        document.head.appendChild(script);
      }
    }

    return () => {
      api?.dispose();
      jitsiApiRef.current = null;
    };
  }, [inCall, roomName, displayName]);

  const fetchAppointmentDetails = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setAppointment(data.appointment);
    } catch (error) {
      console.error('Failed to fetch appointment:', error);
      toast.error('Failed to load appointment details');
    } finally {
      setIsLoading(false);
    }
  };

  const updateAppointmentStatus = async (status: string) => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      console.error('Failed to update appointment status:', error);
    }
  };

  const joinCall = () => {
    updateAppointmentStatus('IN_PROGRESS');
    setInCall(true);
  };

  const handleEndCall = async () => {
    jitsiApiRef.current?.dispose();
    jitsiApiRef.current = null;
    setInCall(false);
    await updateAppointmentStatus('COMPLETED');
    toast.success('Consultation completed');
    router.push(isDoctor ? '/dashboard/doctor' : '/dashboard/mother');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href={isDoctor ? '/dashboard/doctor' : '/dashboard/mother'}>
                <ArrowLeft className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer" />
              </Link>
              <div>
                <h1 className="text-white font-semibold">Video Consultation</h1>
                <p className="text-gray-400 text-sm">
                  {otherPartyName ? `with ${otherPartyName}` : 'Loading...'}
                </p>
              </div>
            </div>
            {inCall && (
              <button
                onClick={handleEndCall}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End Call</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 bg-black">
        {inCall ? (
          <div id="jitsi-container" style={{ height: 'calc(100vh - 60px)', width: '100%' }} />
        ) : (
          <div className="max-w-2xl mx-auto px-4 py-12">
            {/* Pre-call Screen */}
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

            {/* Appointment Info */}
            <div className="bg-gray-800 rounded-xl p-6 mb-8">
              <h3 className="text-white font-semibold mb-4">Appointment Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Date</span>
                  <span className="text-white">
                    {appointment?.date &&
                      new Date(appointment.date).toLocaleDateString('en-IN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
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

            {/* Tips */}
            <div className="bg-blue-900/30 border border-blue-800 rounded-xl p-6 mb-8">
              <h3 className="text-blue-400 font-semibold mb-3">Before you join</h3>
              <ul className="text-blue-300 text-sm space-y-2">
                <li>• Ensure you&apos;re in a quiet, well-lit area</li>
                <li>• Test your camera and microphone</li>
                <li>• Have your medical reports ready if needed</li>
                <li>• Keep a notepad to write down instructions</li>
              </ul>
            </div>

            {/* Join Button */}
            <button
              onClick={joinCall}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center space-x-3 transition-colors"
            >
              <Video className="w-6 h-6" />
              <span>Join Video Call</span>
            </button>

            <p className="text-center text-gray-500 text-sm mt-4">
              Both you and {isDoctor ? 'the patient' : 'the doctor'} will join the same room
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
