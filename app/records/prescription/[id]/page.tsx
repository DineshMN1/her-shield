'use client';

import { useState, useEffect } from 'react';
import { Pill, ArrowLeft, Calendar, User, Download, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

export default function PrescriptionViewPage() {
  const params = useParams();
  const appointmentId = params.id as string;

  const [prescription, setPrescription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrescription();
  }, []);

  const fetchPrescription = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(
        `/api/medical-records/prescriptions/appointment/${appointmentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setPrescription(data.prescription);
    } catch (error) {
      toast.error('Failed to fetch prescription');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Prescription',
      text: `Prescription from Dr. ${prescription.appointment.doctor.firstName}`,
      url: window.location.href,
    };

    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Pill className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Prescription not found</p>
          <Link href="/records" className="btn-primary mt-4 inline-block">
            Back to Records
          </Link>
        </div>
      </div>
    );
  }

  const medicines = prescription.medicines as any[];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/records">
                <ArrowLeft className="w-5 h-5 text-gray-600 hover:text-gray-900 cursor-pointer" />
              </Link>
              <h1>Prescription</h1>
            </div>
            <button onClick={handleShare} className="p-2 hover:bg-gray-100 rounded-lg">
              <Share2 className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header Card */}
        <div className="card">
          <div className="flex items-start space-x-4">
            <div className="bg-pink-100 p-3 rounded-full">
              <User className="w-6 h-6 text-pink-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-lg">
                Dr. {prescription.appointment.doctor.firstName} {prescription.appointment.doctor.lastName}
              </h2>
              <p className="text-gray-600 text-sm">
                {prescription.appointment.doctor.doctorProfile?.specialization || 'Specialist'}
              </p>
              <div className="flex items-center space-x-1 mt-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>{new Date(prescription.createdAt).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Diagnosis */}
        <div className="card">
          <h3 className="font-semibold mb-3 text-gray-700">Diagnosis</h3>
          <p className="text-gray-800">{prescription.diagnosis}</p>
        </div>

        {/* Medicines */}
        <div className="card">
          <h3 className="font-semibold mb-4 text-gray-700">Prescribed Medicines</h3>
          <div className="space-y-4">
            {medicines.map((med: any, index: number) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Pill className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">{med.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{med.dosage}</p>
                    </div>
                  </div>
                  <span className="text-sm bg-white px-2 py-1 rounded border">
                    {med.duration}
                  </span>
                </div>
                <div className="mt-3 pl-11">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Frequency:</span> {med.frequency}
                  </p>
                  {med.instructions && (
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Instructions:</span> {med.instructions}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Advice */}
        {prescription.advice && (
          <div className="card">
            <h3 className="font-semibold mb-3 text-gray-700">Doctor's Advice</h3>
            <p className="text-gray-800 whitespace-pre-line">{prescription.advice}</p>
          </div>
        )}

        {/* Follow-up */}
        {prescription.followUpDate && (
          <div className="card bg-blue-50 border-blue-200">
            <div className="flex items-center space-x-3">
              <Calendar className="w-6 h-6 text-blue-600" />
              <div>
                <p className="text-sm text-blue-700">Follow-up Appointment</p>
                <p className="font-semibold text-blue-800">
                  {new Date(prescription.followUpDate).toLocaleDateString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
