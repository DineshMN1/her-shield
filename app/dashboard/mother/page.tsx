'use client';

import { useState, useEffect } from 'react';
import {
  Heart, Calendar, MessageCircle, Video, Settings, LogOut,
  FileText, Apple, Phone, Clock, AlertCircle, Pill, ChevronRight, Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useRequirePatient } from '@/lib/useAuth';

interface Appointment {
  id: string;
  doctorName: string;
  date: string;
  time: string;
  scheduledAt: string;
  type: string;
  status: string;
  reason: string;
}

interface Prescription {
  id: string;
  diagnosis: string;
  medicines: { name: string; dosage: string; frequency: string }[];
  createdAt: string;
  doctorName?: string;
}

export default function MotherDashboard() {
  const { user, loading, logout } = useRequirePatient();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [instantMeetLoading, setInstantMeetLoading] = useState(false);
  const [meetReason, setMeetReason] = useState('');
  const [showMeetModal, setShowMeetModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoadingData(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoadingData(false);
        return;
      }

      const [apptRes, prescRes] = await Promise.all([
        fetch('/api/appointments?status=SCHEDULED', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/medical-records/prescriptions/my', {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
      ]);

      if (apptRes.ok) {
        const apptData = await apptRes.json();
        const now = new Date();
        const upcoming = (apptData.appointments || []).filter((apt: Appointment) => {
          const aptDate = new Date(apt.scheduledAt || `${apt.date}T${apt.time}`);
          return aptDate >= now;
        });
        setAppointments(upcoming);
      }

      if (prescRes?.ok) {
        const prescData = await prescRes.json();
        setPrescriptions(prescData.prescriptions || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleInstantMeet = async () => {
    setInstantMeetLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('You must be logged in to start a meet.');
        setInstantMeetLoading(false);
        return;
      }
      const res = await fetch('/api/instant-meet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: meetReason || 'Immediate consultation needed' }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Meeting room created! Doctors are being notified.');
        setShowMeetModal(false);
        setMeetReason('');

        if (data.appointmentId) {
          // Notify doctors before navigation
          if (data.onCallDoctors?.length > 0 && (data.appointmentId || data.roomLink)) {
            try {
              const notifyPayload: any = {
                doctorIds: data.onCallDoctors.map((doc: { id: string }) => doc.id),
                reason: meetReason || 'Immediate consultation',
              };
              if (data.appointmentId) {
                notifyPayload.appointmentId = data.appointmentId;
              } else if (data.roomLink) {
                notifyPayload.roomLink = data.roomLink;
              }
              await fetch('/api/notifyDoctors', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(notifyPayload),
              });
            } catch (e) {
              // Optionally log or toast error
              console.error('Failed to notify doctors', e);
            }
          }
          if (data.appointmentId) {
            router.push(`/video/${data.appointmentId}`);
          } else {
            // Validate roomLink before opening
            let safeToOpen = false;
            if (typeof data.roomLink === 'string') {
              try {
                const url = new URL(data.roomLink);
                // Replace with your actual production domains
                const allowedDomains = ['healthsos.com', 'meet.ffmuc.net', 'meet.jit.si', 'zoom.us'];
                const normalizedHost = url.hostname.toLowerCase().replace(/\.$/, '');
                safeToOpen =
                  url.protocol === 'https:' &&
                  allowedDomains.some((domain) => {
                    const d = domain.toLowerCase().replace(/\.$/, '');
                    return (
                      normalizedHost === d ||
                      normalizedHost.endsWith('.' + d)
                    );
                  });
              } catch (e) {
                // Invalid URL
              }
            }
            if (safeToOpen) {
              window.open(data.roomLink, '_blank');
            } else {
              toast.error('Invalid or unsafe meeting link.');
            }
          }
        }

        // (Notify logic moved above navigation)
      } else {
        toast.error(data.message || 'Failed to create meeting');
      }
    } catch (error) {
      toast.error('Failed to create instant meeting');
    } finally {
      setInstantMeetLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-2 rounded-lg">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold">Health SOS</h2>
              <p className="text-xs text-gray-500">Mother&apos;s Portal</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/settings">
              <Settings className="w-5 h-5 text-gray-600 hover:text-gray-900 cursor-pointer" />
            </Link>
            <button onClick={handleLogout}>
              <LogOut className="w-5 h-5 text-gray-600 hover:text-gray-900" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-xl font-bold">Welcome back, {user?.firstName}!</h1>
          <p className="text-gray-600 text-sm">How are you feeling today?</p>
        </div>

        {/* Emergency + Instant Meet Row */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Link href="/sos">
            <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-4 text-white cursor-pointer hover:shadow-lg transition-shadow">
              <div className="bg-white/20 w-10 h-10 rounded-full flex items-center justify-center mb-2">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="font-bold text-sm">Emergency SOS</p>
              <p className="text-xs text-red-100">Tap for emergency help</p>
            </div>
          </Link>

          <button onClick={() => setShowMeetModal(true)} className="text-left">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white cursor-pointer hover:shadow-lg transition-shadow">
              <div className="bg-white/20 w-10 h-10 rounded-full flex items-center justify-center mb-2">
                <Zap className="w-5 h-5" />
              </div>
              <p className="font-bold text-sm">Instant Meet</p>
              <p className="text-xs text-blue-100">Quick doctor consultation</p>
            </div>
          </button>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Link href="/appointments/book">
            <div className="bg-white rounded-xl p-3 text-center cursor-pointer hover:shadow-md transition-shadow">
              <div className="bg-pink-100 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-1.5">
                <Calendar className="w-5 h-5 text-pink-600" />
              </div>
              <p className="font-medium text-xs">Book</p>
            </div>
          </Link>
          <Link href="/nutrition">
            <div className="bg-white rounded-xl p-3 text-center cursor-pointer hover:shadow-md transition-shadow">
              <div className="bg-green-100 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-1.5">
                <Apple className="w-5 h-5 text-green-600" />
              </div>
              <p className="font-medium text-xs">Nutrition</p>
            </div>
          </Link>
          <Link href="/records">
            <div className="bg-white rounded-xl p-3 text-center cursor-pointer hover:shadow-md transition-shadow">
              <div className="bg-orange-100 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-1.5">
                <FileText className="w-5 h-5 text-orange-600" />
              </div>
              <p className="font-medium text-xs">Records</p>
            </div>
          </Link>
        </div>

        {/* More Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link href="/appointments?filter=video">
            <div className="bg-white rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow">
              <div className="bg-blue-100 p-2.5 rounded-lg">
                <Video className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Video Calls</p>
                <p className="text-xs text-gray-500">Join consultations</p>
              </div>
            </div>
          </Link>
          <Link href="/ai-assistant">
            <div className="bg-white rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow">
              <div className="bg-purple-100 p-2.5 rounded-lg">
                <MessageCircle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-sm">AI Assistant</p>
                <p className="text-xs text-gray-500">Health queries</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="font-bold">Upcoming Appointments</h2>
            <Link href="/appointments" className="text-sm text-pink-600 hover:text-pink-700 flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="p-4">
            {loadingData ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Calendar className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No upcoming appointments</p>
                <Link href="/appointments/book" className="text-pink-600 text-sm mt-1 inline-block hover:underline">
                  Book one now
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.slice(0, 5).map((apt) => (
                  <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${apt.type === 'VIDEO' ? 'bg-blue-100' : 'bg-green-100'}`}>
                        {apt.type === 'VIDEO' ? (
                          <Video className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{apt.doctorName}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(apt.scheduledAt || `${apt.date}T${apt.time}`).toLocaleDateString('en-IN', {
                            weekday: 'short', day: 'numeric', month: 'short',
                          })} at {apt.time}
                        </p>
                      </div>
                    </div>
                    {apt.type === 'VIDEO' && (
                      <Link
                        href={`/video/${apt.id}`}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 flex items-center gap-1"
                      >
                        <Video className="w-3.5 h-3.5" />
                        Join
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Prescriptions */}
        {prescriptions.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm mb-6">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="font-bold">Recent Prescriptions</h2>
              <Link href="/records" className="text-sm text-pink-600 hover:text-pink-700 flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-4 space-y-3">
              {prescriptions.slice(0, 3).map((presc) => (
                <div key={presc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-pink-100 p-2 rounded-lg">
                      <Pill className="w-4 h-4 text-pink-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{presc.diagnosis}</p>
                      <p className="text-xs text-gray-500">
                        {presc.medicines?.length || 0} medicines
                        {presc.createdAt && ` - ${new Date(presc.createdAt).toLocaleDateString('en-IN')}`}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/records/prescription/${presc.id}`}
                    className="text-pink-600 text-xs hover:underline"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Tips */}
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 mb-6">
          <h3 className="font-bold text-sm mb-2">Quick Tips</h3>
          <div className="space-y-2">
            <p className="text-xs text-gray-600 flex items-start gap-2">
              <span className="text-pink-500 mt-0.5">*</span>
              Stay hydrated - drink 8-10 glasses of water daily
            </p>
            <p className="text-xs text-gray-600 flex items-start gap-2">
              <span className="text-pink-500 mt-0.5">*</span>
              Take your prenatal vitamins regularly
            </p>
            <p className="text-xs text-gray-600 flex items-start gap-2">
              <span className="text-pink-500 mt-0.5">*</span>
              Light exercise like walking helps during pregnancy
            </p>
          </div>
        </div>

        {/* Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-10">
          <div className="max-w-7xl mx-auto flex justify-around">
            <Link href="/dashboard/mother" className="flex flex-col items-center py-1">
              <Heart className="w-5 h-5 text-pink-600" />
              <span className="text-xs mt-0.5 text-pink-600 font-medium">Home</span>
            </Link>
            <Link href="/appointments" className="flex flex-col items-center py-1">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-xs mt-0.5 text-gray-400">Appointments</span>
            </Link>
            <Link href="/sos" className="flex flex-col items-center py-1">
              <Phone className="w-5 h-5 text-gray-400" />
              <span className="text-xs mt-0.5 text-gray-400">SOS</span>
            </Link>
            <Link href="/nutrition" className="flex flex-col items-center py-1">
              <Apple className="w-5 h-5 text-gray-400" />
              <span className="text-xs mt-0.5 text-gray-400">Nutrition</span>
            </Link>
            <Link href="/records" className="flex flex-col items-center py-1">
              <FileText className="w-5 h-5 text-gray-400" />
              <span className="text-xs mt-0.5 text-gray-400">Records</span>
            </Link>
          </div>
        </div>

        {/* Spacer for bottom nav */}
        <div className="h-16" />
      </div>

      {/* Instant Meet Modal */}
      {showMeetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-lg mb-2">Instant Consultation</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will create a video room and notify available doctors immediately.
              This is for non-emergency quick consultations.
            </p>
            <textarea
              value={meetReason}
              onChange={(e) => setMeetReason(e.target.value)}
              placeholder="Briefly describe your concern (optional)..."
              className="w-full p-3 border rounded-lg text-sm resize-none mb-4"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowMeetModal(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleInstantMeet}
                disabled={instantMeetLoading}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {instantMeetLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    Start Meeting
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
