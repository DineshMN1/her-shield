'use client';

import { useState, useEffect } from 'react';
import { Heart, Calendar, Activity, MessageCircle, Video, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function MotherDashboard() {
  const [user, setUser] = useState<any>(null);
  const [appointments, setAppointments] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/appointments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setAppointments(data.appointments || []);
    } catch (error) {
      console.error('Failed to fetch appointments');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-2 rounded-lg">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <h2>Health SOS</h2>
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
          <h1>Welcome back, {user?.firstName}!</h1>
          <p className="text-gray-600 text-sm">How are you feeling today?</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Link href="/sos">
            <div className="card text-center cursor-pointer hover:shadow-md">
              <div className="bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                <Heart className="w-6 h-6 text-red-600" />
              </div>
              <p className="font-medium text-sm">Emergency SOS</p>
            </div>
          </Link>

          <Link href="/appointments?filter=video">
            <div className="card text-center cursor-pointer hover:shadow-md">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                <Video className="w-6 h-6 text-blue-600" />
              </div>
              <p className="font-medium text-sm">Video Call</p>
            </div>
          </Link>

          <Link href="/ai-assistant">
            <div className="card text-center cursor-pointer hover:shadow-md">
              <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                <MessageCircle className="w-6 h-6 text-purple-600" />
              </div>
              <p className="font-medium text-sm">AI Assistant</p>
            </div>
          </Link>

          <Link href="/health">
            <div className="card text-center cursor-pointer hover:shadow-md">
              <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <p className="font-medium text-sm">Health Tracking</p>
            </div>
          </Link>
        </div>

        {/* Upcoming Appointments */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2>Upcoming Appointments</h2>
            <Link href="/appointments" className="text-sm text-pink-600 hover:text-pink-700">
              View All
            </Link>
          </div>

          {appointments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No upcoming appointments</p>
              <Link href="/appointments/book" className="btn-primary mt-4 inline-block">
                Book Appointment
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((apt: any) => (
                <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{apt.doctorName}</p>
                    <p className="text-sm text-gray-600">{apt.type === 'VIDEO' ? 'Video Consultation' : 'Clinic Visit'}</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">{new Date(apt.date).toLocaleDateString('en-IN')}</p>
                      <p className="text-xs text-gray-600">{apt.time}</p>
                    </div>
                    {apt.type === 'VIDEO' && apt.status === 'SCHEDULED' && (
                      <Link
                        href={`/video/${apt.id}`}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1"
                      >
                        <Video className="w-4 h-4" />
                        Join
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
