'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Video, MapPin, Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const isDoctor = currentUser?.role === 'DOCTOR';

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [filter]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/appointments`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      const data = await response.json();
      const allAppointments = data.appointments || [];
      const now = new Date();

      // Filter based on upcoming or past
      const filtered = allAppointments.filter((apt: any) => {
        const aptDate = new Date(apt.scheduledAt || `${apt.date}T${apt.time}`);
        if (filter === 'upcoming') {
          // Upcoming: future dates with SCHEDULED or IN_PROGRESS status
          return aptDate >= now && ['SCHEDULED', 'IN_PROGRESS'].includes(apt.status);
        } else {
          // Past: past dates OR completed/cancelled status
          return aptDate < now || ['COMPLETED', 'CANCELLED'].includes(apt.status);
        }
      });

      setAppointments(filtered);
    } catch (error) {
      toast.error('Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href={isDoctor ? '/dashboard/doctor' : '/dashboard/mother'}>
                <ArrowLeft className="w-5 h-5 text-gray-600 hover:text-gray-900 cursor-pointer" />
              </Link>
              <h1>{isDoctor ? 'Patient Appointments' : 'My Appointments'}</h1>
            </div>
            <Link href="/appointments/book" className="btn-primary flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Book New</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filter Tabs */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'upcoming'
                ? 'bg-pink-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'past'
                ? 'bg-pink-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Past
          </button>
        </div>

        {/* Appointments List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading appointments...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">No {filter} appointments</p>
            <Link href="/appointments/book" className="btn-primary inline-block">
              Book Your First Appointment
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((apt: any) => (
              <div key={apt.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="bg-pink-100 p-3 rounded-lg">
                      {apt.type === 'VIDEO' ? (
                        <Video className="w-6 h-6 text-pink-600" />
                      ) : (
                        <MapPin className="w-6 h-6 text-pink-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {isDoctor ? apt.patientName : `Dr. ${apt.doctorName}`}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {isDoctor ? apt.reason || 'Consultation' : apt.specialty}
                      </p>
                      <div className="flex items-center space-x-4 mt-3 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(apt.date).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{apt.time}</span>
                        </div>
                      </div>
                      {apt.type === 'VIDEO' && (apt.status === 'SCHEDULED' || apt.status === 'IN_PROGRESS') && (
                        <Link href={`/video/${apt.id}`} className="btn-primary mt-3 inline-flex items-center gap-2 text-sm">
                          <Video className="w-4 h-4" />
                          Join Video Call
                        </Link>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    apt.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                    apt.status === 'IN_PROGRESS' ? 'bg-green-100 text-green-700' :
                    apt.status === 'COMPLETED' ? 'bg-gray-100 text-gray-700' :
                    apt.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {apt.status === 'IN_PROGRESS' ? 'In Progress' : apt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
