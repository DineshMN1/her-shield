'use client';

import { useState, useEffect } from 'react';
import { Pill, ArrowLeft, Plus, Trash2, Loader, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export default function CreatePrescriptionPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.id as string;

  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [diagnosis, setDiagnosis] = useState('');
  const [advice, setAdvice] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([
    { name: '', dosage: '', frequency: '', duration: '', instructions: '' },
  ]);

  useEffect(() => {
    fetchAppointment();
  }, []);

  const fetchAppointment = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/appointments/${appointmentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setAppointment(data.appointment);
    } catch (error) {
      toast.error('Failed to fetch appointment');
    } finally {
      setLoading(false);
    }
  };

  const addMedicine = () => {
    setMedicines([
      ...medicines,
      { name: '', dosage: '', frequency: '', duration: '', instructions: '' },
    ]);
  };

  const removeMedicine = (index: number) => {
    if (medicines.length > 1) {
      setMedicines(medicines.filter((_, i) => i !== index));
    }
  };

  const updateMedicine = (index: number, field: keyof Medicine, value: string) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validMedicines = medicines.filter((m) => m.name.trim() !== '');
    if (validMedicines.length === 0) {
      toast.error('Please add at least one medicine');
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/medical-records/prescriptions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            appointmentId,
            diagnosis,
            medicines: validMedicines,
            advice,
            followUpDate: followUpDate || undefined,
          }),
        }
      );

      if (res.ok) {
        toast.success('Prescription created successfully!');
        router.push(`/dashboard/doctor`);
      } else {
        const data = await res.json();
        toast.error(data.message || 'Failed to create prescription');
      }
    } catch (error) {
      toast.error('Failed to create prescription');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <Link href="/dashboard/doctor">
              <ArrowLeft className="w-5 h-5 text-gray-600 hover:text-gray-900 cursor-pointer" />
            </Link>
            <h1>Create Prescription</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Patient Info */}
        {appointment && (
          <div className="card mb-6">
            <p className="text-sm text-gray-600">Patient</p>
            <p className="font-semibold">{appointment.patientName}</p>
            <p className="text-sm text-gray-500 mt-1">{appointment.reason}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Diagnosis */}
          <div className="card">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Diagnosis *
            </label>
            <textarea
              required
              rows={2}
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="input-field resize-none"
              placeholder="Enter diagnosis..."
            />
          </div>

          {/* Medicines */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Medicines</h3>
              <button
                type="button"
                onClick={addMedicine}
                className="text-pink-600 hover:text-pink-700 flex items-center space-x-1 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Medicine</span>
              </button>
            </div>

            <div className="space-y-4">
              {medicines.map((med, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 relative">
                  {medicines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMedicine(index)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="Medicine name *"
                        value={med.name}
                        onChange={(e) => updateMedicine(index, 'name', e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Dosage (e.g., 500mg)"
                      value={med.dosage}
                      onChange={(e) => updateMedicine(index, 'dosage', e.target.value)}
                      className="input-field"
                    />
                    <input
                      type="text"
                      placeholder="Frequency (e.g., Twice daily)"
                      value={med.frequency}
                      onChange={(e) => updateMedicine(index, 'frequency', e.target.value)}
                      className="input-field"
                    />
                    <input
                      type="text"
                      placeholder="Duration (e.g., 7 days)"
                      value={med.duration}
                      onChange={(e) => updateMedicine(index, 'duration', e.target.value)}
                      className="input-field"
                    />
                    <input
                      type="text"
                      placeholder="Instructions (e.g., After food)"
                      value={med.instructions}
                      onChange={(e) => updateMedicine(index, 'instructions', e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Advice */}
          <div className="card">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Advice / Instructions
            </label>
            <textarea
              rows={3}
              value={advice}
              onChange={(e) => setAdvice(e.target.value)}
              className="input-field resize-none"
              placeholder="Additional advice for the patient..."
            />
          </div>

          {/* Follow-up */}
          <div className="card">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Follow-up Date (Optional)
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={followUpDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full flex items-center justify-center"
          >
            {submitting ? (
              <Loader className="animate-spin h-5 w-5" />
            ) : (
              <>
                <Pill className="w-5 h-5 mr-2" />
                Create Prescription
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
