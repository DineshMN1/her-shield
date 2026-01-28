'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, ArrowLeft, Loader } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function BookAppointmentPage() {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [appointmentData, setAppointmentData] = useState({
    date: '',
    time: '',
    type: 'CLINIC' as 'CLINIC' | 'VIDEO',
    reason: '',
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/hospitals`);
      const data = await response.json();
      setDoctors(data.doctors || []);
    } catch (error) {
      toast.error('Failed to fetch doctors');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDoctor) {
      toast.error('Please select a doctor');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          doctorId: selectedDoctor,
          ...appointmentData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Appointment booked successfully!');
        router.push('/appointments');
      } else {
        toast.error(data.message || 'Failed to book appointment');
      }
    } catch (error) {
      toast.error('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <Link href="/appointments">
              <ArrowLeft className="w-5 h-5 text-gray-600 hover:text-gray-900 cursor-pointer" />
            </Link>
            <h1>Book Appointment</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="card space-y-6">
          {/* Select Doctor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Doctor
            </label>
            <select
              required
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="input-field"
            >
              <option value="">Choose a doctor</option>
              {doctors.map((doctor: any) => (
                <option key={doctor.id} value={doctor.id}>
                  Dr. {doctor.name} - {doctor.specialty}
                </option>
              ))}
            </select>
          </div>

          {/* Appointment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Appointment Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAppointmentData({ ...appointmentData, type: 'CLINIC' })}
                className={`p-4 rounded-lg border-2 text-sm font-medium transition-all ${
                  appointmentData.type === 'CLINIC'
                    ? 'border-pink-500 bg-pink-50 text-pink-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Clinic Visit
              </button>
              <button
                type="button"
                onClick={() => setAppointmentData({ ...appointmentData, type: 'VIDEO' })}
                className={`p-4 rounded-lg border-2 text-sm font-medium transition-all ${
                  appointmentData.type === 'VIDEO'
                    ? 'border-pink-500 bg-pink-50 text-pink-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Video Consultation
              </button>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={appointmentData.date}
                onChange={(e) => setAppointmentData({ ...appointmentData, date: e.target.value })}
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Time
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="time"
                required
                value={appointmentData.time}
                onChange={(e) => setAppointmentData({ ...appointmentData, time: e.target.value })}
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Visit
            </label>
            <textarea
              required
              rows={4}
              value={appointmentData.reason}
              onChange={(e) => setAppointmentData({ ...appointmentData, reason: e.target.value })}
              className="input-field resize-none"
              placeholder="Brief description of your concerns..."
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center"
          >
            {loading ? (
              <Loader className="animate-spin h-5 w-5" />
            ) : (
              'Book Appointment'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
