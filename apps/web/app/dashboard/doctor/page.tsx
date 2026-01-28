'use client';

import { useState, useEffect } from 'react';
import { Heart, Calendar, Users, Video, MessageCircle, Settings, LogOut, Clock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function DoctorDashboard() {
  const [user, setUser] = useState<any>(null);
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch today's appointments
      const apptResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/appointments/doctor/today`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const apptData = await apptResponse.json();
      setAppointments(apptData.appointments || []);

      // Fetch patients
      const patientResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/patients`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const patientData = await patientResponse.json();
      setPatients(patientData.patients || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data');
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
            <div>
              <h2>Health SOS</h2>
              <p className="text-xs text-gray-500">Doctor Portal</p>
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
          <h1>Welcome, Dr. {user?.firstName}!</h1>
          <p className="text-gray-600 text-sm">Here's your schedule for today</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Appointments</p>
                <p className="text-2xl font-semibold mt-1">{appointments.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Patients</p>
                <p className="text-2xl font-semibold mt-1">{patients.length}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Video Consultations</p>
                <p className="text-2xl font-semibold mt-1">
                  {appointments.filter((a: any) => a.type === 'VIDEO').length}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Video className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="card mb-6">
          <h2 className="mb-4">Today's Schedule</h2>
          
          {appointments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No appointments scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((apt: any) => (
                <div key={apt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="bg-pink-100 w-10 h-10 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-pink-600" />
                    </div>
                    <div>
                      <p className="font-medium">{apt.patientName}</p>
                      <p className="text-sm text-gray-600">{apt.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{apt.time}</p>
                    {apt.type === 'VIDEO' && (
                      <Link href={`/video/${apt.id}`} className="text-sm text-blue-600 hover:text-blue-700">
                        Join Call
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Patients */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2>Recent Patients</h2>
            <Link href="/patients" className="text-sm text-pink-600 hover:text-pink-700">
              View All
            </Link>
          </div>

          {patients.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No patients yet</p>
          ) : (
            <div className="space-y-3">
              {patients.slice(0, 5).map((patient: any) => (
                <div key={patient.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="bg-purple-100 w-10 h-10 rounded-full flex items-center justify-center">
                      <span className="text-purple-700 font-medium text-sm">
                        {patient.firstName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{patient.firstName}</p>
                      <p className="text-xs text-gray-600">{patient.email}</p>
                    </div>
                  </div>
                  <Link href={`/patients/${patient.id}`} className="text-sm text-pink-600 hover:text-pink-700">
                    View Profile
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
