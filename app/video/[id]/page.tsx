'use client';

import { useState, useEffect } from 'react';
import { Video, ArrowLeft, PhoneOff } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';

export default function VideoCallPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.id as string;

  const [appointment, setAppointment] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inCall, setInCall] = useState(false);

  // Jitsi Meet room - consistent for both doctor and patient
  const roomName = `HealthSOS${appointmentId.replace(/-/g, '')}`;

  const isDoctor = currentUser?.role === 'DOCTOR';
  const otherPartyName = isDoctor
    ? appointment?.patientName
    : `Dr. ${appointment?.doctorName}`;

  // Build display name for Jitsi
  const displayName = currentUser
    ? (isDoctor ? `Dr. ${currentUser.firstName}` : currentUser.firstName)
    : 'Guest';

  // Build Jitsi iframe URL - using jitsi.ffmuc.net (no moderator requirement)
  const jitsiDomain = 'meet.ffmuc.net';
  const jitsiUrl = `https://${jitsiDomain}/${roomName}#userInfo.displayName="${encodeURIComponent(displayName)}"&config.prejoinConfig.enabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.disableDeepLinking=true&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.TOOLBAR_BUTTONS=["microphone","camera","closedcaptions","desktop","fullscreen","fodeviceselection","hangup","chat","settings","videoquality","tileview"]`;

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
    fetchAppointmentDetails();
  }, []);

  const fetchAppointmentDetails = async () => {
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(
        `/api/appointments/${appointmentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      setAppointment(data.appointment);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch appointment:', error);
      toast.error('Failed to load appointment details');
      setIsLoading(false);
    }
  };

  const updateAppointmentStatus = async (status: string) => {
    const token = localStorage.getItem('token');
    try {
      await fetch(
        `/api/appointments/${appointmentId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        }
      );
    } catch (error) {
      console.error('Failed to update appointment status:', error);
    }
  };

  const joinCall = () => {
    updateAppointmentStatus('IN_PROGRESS');
    setInCall(true);
  };

  const handleEndCall = async () => {
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
                <h1 className="text-white font-semibold">{otherPartyName || 'Video Consultation'}</h1>
                <p className="text-gray-400 text-sm">
                  {isDoctor ? 'Patient Consultation' : (appointment?.specialty || 'Consultation')}
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
          <iframe
            src={jitsiUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="w-full h-full border-0 bg-black"
            style={{ minHeight: 'calc(100vh - 60px)' }}
          />
        ) : (
          <div className="max-w-2xl mx-auto px-4 py-12">
            {/* Pre-call Screen */}
            <div className="text-center mb-8">
              <div className="bg-gray-800 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <Video className="w-12 h-12 text-pink-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Ready to Join?</h2>
              <p className="text-gray-400">
                Consultation with {otherPartyName}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                {isDoctor ? 'You are joining as Doctor' : 'You are joining as Patient'}
              </p>
            </div>

            {/* Appointment Info */}
            <div className="bg-gray-800 rounded-xl p-6 mb-8">
              <h3 className="text-white font-semibold mb-4">Appointment Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Date</span>
                  <span className="text-white">
                    {appointment?.date && new Date(appointment.date).toLocaleDateString('en-IN', {
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
                <li>• Ensure you're in a quiet, well-lit area</li>
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
