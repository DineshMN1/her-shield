'use client';

import { useState, useEffect } from 'react';
import { Video, ArrowLeft, PhoneOff, ExternalLink } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { buildJitsiJoinUrl } from '@/lib/jitsi';

export default function VideoCallPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.id as string;

  const [appointment, setAppointment] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inCall, setInCall] = useState(false);

  // For instant meets the appointment has a stored roomId — use it so all parties share the same room.
  // For scheduled appointments fall back to the appointment ID.
  const roomName = appointment?.roomId
    ? appointment.roomId
    : `HealthSOS${appointmentId.replace(/-/g, '')}`;

  const isDoctor = currentUser?.role === 'DOCTOR';
  const isAdmin = currentUser?.role === 'ADMIN';

  // Don't prepend "Dr." — DB may already include it in the stored name
  const otherPartyName = isAdmin
    ? [appointment?.patientName, appointment?.doctorName].filter(Boolean).join(' · ')
    : isDoctor
      ? appointment?.patientName
      : appointment?.doctorName;

  const displayName = currentUser
    ? (isDoctor
        ? `Dr. ${currentUser.firstName} ${currentUser.lastName}`.trim()
        : isAdmin
          ? `Admin ${currentUser.firstName} ${currentUser.lastName}`.trim()
        : `${currentUser.firstName} ${currentUser.lastName}`.trim())
    : 'Guest';

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setCurrentUser(JSON.parse(userData));
    fetchAppointmentDetails();
  }, []);

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
    if (!roomName) return; // wait until appointment loaded
    updateAppointmentStatus('IN_PROGRESS');
    const jitsiUrl = buildJitsiJoinUrl(roomName, displayName);
    window.open(jitsiUrl, '_blank');
    setInCall(true);
  };

  const handleEndCall = async () => {
    setInCall(false);
    await updateAppointmentStatus('COMPLETED');
    toast.success('Consultation completed');
    router.push(isAdmin ? '/dashboard/admin' : isDoctor ? '/dashboard/doctor' : '/dashboard/mother');
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
              <Link href={isAdmin ? '/dashboard/admin' : isDoctor ? '/dashboard/doctor' : '/dashboard/mother'}>
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

      {/* Main Area */}
      <div className="flex-1 bg-gray-900">
        {inCall ? (
          /* Call in progress — Jitsi is open in a separate tab */
          <div className="max-w-2xl mx-auto px-4 py-16 text-center">
            <div className="bg-green-900/30 border border-green-700 rounded-2xl p-10 mb-8">
              <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Video className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Call in Progress</h2>
              <p className="text-green-300 mb-1">
                Your video call with {otherPartyName} is open in a new tab.
              </p>
              <p className="text-gray-400 text-sm">
                Return here when the consultation is finished and click &quot;End Call&quot;.
              </p>
            </div>

            <button
              onClick={joinCall}
              className="w-full mb-4 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center space-x-2 transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
              <span>Reopen Video Call Tab</span>
            </button>

            <button
              onClick={handleEndCall}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center space-x-2 transition-colors"
            >
              <PhoneOff className="w-5 h-5" />
              <span>End Consultation</span>
            </button>
          </div>
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
              <ExternalLink className="w-6 h-6" />
              <span>Join Video Call</span>
            </button>

            <p className="text-center text-gray-500 text-sm mt-4">
              Opens in a new tab — both you and {isDoctor ? 'the patient' : 'the doctor'} join the same room
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
