'use client';

import { useState, useEffect } from 'react';
import { User, Calendar, FileText, Pill, ArrowLeft, Phone, Mail, Heart, Camera } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

export default function PatientProfilePage() {
  const params = useParams();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatientData();
  }, [patientId]);

  const fetchPatientData = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/users/patients/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        toast.error('Patient not found');
        return;
      }

      const data = await res.json();
      setPatient(data.patient);
      setAppointments(data.appointments || []);
      setScans(data.scans || []);
    } catch (error) {
      toast.error('Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Patient not found</p>
          <Link href="/dashboard/doctor" className="btn-primary mt-4 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <Link href="/dashboard/doctor">
              <ArrowLeft className="w-5 h-5 text-gray-600 hover:text-gray-900 cursor-pointer" />
            </Link>
            <h1>Patient Profile</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Patient Info Card */}
        <div className="card">
          <div className="flex items-start space-x-4">
            <div className="bg-pink-100 w-16 h-16 rounded-full flex items-center justify-center">
              <span className="text-pink-700 font-bold text-xl">
                {patient.firstName.charAt(0)}{patient.lastName.charAt(0)}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{patient.firstName} {patient.lastName}</h2>
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>{patient.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>{patient.phone}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Health Info */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {patient.bloodGroup && (
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <p className="text-xs text-red-600">Blood Group</p>
                <p className="font-bold text-red-700">{patient.bloodGroup}</p>
              </div>
            )}
            {patient.pregnancyWeek && (
              <div className="bg-pink-50 p-3 rounded-lg text-center">
                <p className="text-xs text-pink-600">Pregnancy Week</p>
                <p className="font-bold text-pink-700">{patient.pregnancyWeek}</p>
              </div>
            )}
            {patient.dueDate && (
              <div className="bg-purple-50 p-3 rounded-lg text-center">
                <p className="text-xs text-purple-600">Due Date</p>
                <p className="font-bold text-purple-700">
                  {new Date(patient.dueDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {patient.allergies?.length > 0 && (
              <div className="bg-orange-50 p-3 rounded-lg text-center">
                <p className="text-xs text-orange-600">Allergies</p>
                <p className="font-bold text-orange-700">{patient.allergies.length}</p>
              </div>
            )}
          </div>
        </div>

        {/* Appointments History */}
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>Appointment History</span>
          </h3>

          {appointments.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No appointments yet</p>
          ) : (
            <div className="space-y-3">
              {appointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{apt.date} at {apt.time}</p>
                    <p className="text-sm text-gray-600">{apt.reason || apt.type}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      apt.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      apt.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {apt.status}
                    </span>
                    {apt.status === 'COMPLETED' && !apt.hasPrescription && (
                      <Link
                        href={`/appointment/${apt.id}/prescription`}
                        className="text-xs bg-pink-600 text-white px-3 py-1 rounded-full hover:bg-pink-700"
                      >
                        Add Prescription
                      </Link>
                    )}
                    {apt.hasPrescription && (
                      <Link
                        href={`/records/prescription/${apt.id}`}
                        className="text-xs text-pink-600 hover:text-pink-700"
                      >
                        View Rx
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scans */}
        {scans.length > 0 && (
          <div className="card">
            <h3 className="font-semibold mb-4 flex items-center space-x-2">
              <Camera className="w-5 h-5 text-purple-600" />
              <span>Medical Scans</span>
            </h3>
            <div className="space-y-3">
              {scans.map((scan) => (
                <div key={scan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{scan.title}</p>
                    <p className="text-sm text-gray-600">{scan.scanType} • {new Date(scan.scanDate).toLocaleDateString()}</p>
                  </div>
                  <a
                    href={scan.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
