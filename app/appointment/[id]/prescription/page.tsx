'use client';

import { useState, useEffect } from 'react';
import { Pill, ArrowLeft, Plus, Trash2, Loader, Calendar, Zap } from 'lucide-react';
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

// Common medicines for quick selection
const COMMON_MEDICINES = [
  'Paracetamol',
  'Folic Acid',
  'Iron + Folic Acid',
  'Calcium + Vitamin D3',
  'Vitamin B12',
  'Omeprazole',
  'Pantoprazole',
  'Ondansetron',
  'Doxylamine + B6',
  'Progesterone',
];

const DOSAGE_OPTIONS = ['250mg', '500mg', '650mg', '1g', '5mg', '10mg', '20mg', '40mg'];
const FREQUENCY_OPTIONS = ['Once daily', 'Twice daily', 'Thrice daily', 'Every 8 hours', 'Before bed', 'As needed'];
const DURATION_OPTIONS = ['3 days', '5 days', '7 days', '10 days', '14 days', '1 month', '3 months'];
const INSTRUCTION_OPTIONS = ['Before food', 'After food', 'With food', 'Empty stomach', 'With milk'];

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
        `/api/appointments/${appointmentId}`,
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

  const addQuickMedicine = (name: string) => {
    // Check if medicine already exists
    const exists = medicines.some((m) => m.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      toast.info('Medicine already added');
      return;
    }

    // Add to first empty slot or create new
    const emptyIndex = medicines.findIndex((m) => m.name.trim() === '');
    if (emptyIndex !== -1) {
      const updated = [...medicines];
      updated[emptyIndex].name = name;
      setMedicines(updated);
    } else {
      setMedicines([...medicines, { name, dosage: '', frequency: '', duration: '', instructions: '' }]);
    }
    toast.success(`Added ${name}`);
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
        `/api/medical-records/prescriptions`,
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

          {/* Quick Add Medicines */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-3">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-700">Quick Add</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {COMMON_MEDICINES.map((med) => (
                <button
                  key={med}
                  type="button"
                  onClick={() => addQuickMedicine(med)}
                  className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-full text-sm font-medium transition-colors"
                >
                  + {med}
                </button>
              ))}
            </div>
          </div>

          {/* Medicines */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Medicines ({medicines.filter(m => m.name).length})</h3>
              <button
                type="button"
                onClick={addMedicine}
                className="text-pink-600 hover:text-pink-700 flex items-center space-x-1 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Row</span>
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
                        list={`med-suggestions-${index}`}
                      />
                      <datalist id={`med-suggestions-${index}`}>
                        {COMMON_MEDICINES.map((m) => (
                          <option key={m} value={m} />
                        ))}
                      </datalist>
                    </div>

                    <select
                      value={med.dosage}
                      onChange={(e) => updateMedicine(index, 'dosage', e.target.value)}
                      className="input-field"
                    >
                      <option value="">Dosage</option>
                      {DOSAGE_OPTIONS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>

                    <select
                      value={med.frequency}
                      onChange={(e) => updateMedicine(index, 'frequency', e.target.value)}
                      className="input-field"
                    >
                      <option value="">Frequency</option>
                      {FREQUENCY_OPTIONS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>

                    <select
                      value={med.duration}
                      onChange={(e) => updateMedicine(index, 'duration', e.target.value)}
                      className="input-field"
                    >
                      <option value="">Duration</option>
                      {DURATION_OPTIONS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>

                    <select
                      value={med.instructions}
                      onChange={(e) => updateMedicine(index, 'instructions', e.target.value)}
                      className="input-field"
                    >
                      <option value="">Instructions</option>
                      {INSTRUCTION_OPTIONS.map((i) => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </select>
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
            <div className="flex flex-wrap gap-2 mt-2">
              {['Take rest', 'Drink plenty of water', 'Avoid oily food', 'Regular check-ups'].map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAdvice((prev) => prev ? `${prev}\n${a}` : a)}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs"
                >
                  + {a}
                </button>
              ))}
            </div>
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
            <div className="flex flex-wrap gap-2 mt-2">
              {[7, 14, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => {
                    const date = new Date();
                    date.setDate(date.getDate() + days);
                    setFollowUpDate(date.toISOString().split('T')[0]);
                  }}
                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-xs"
                >
                  {days} days
                </button>
              ))}
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
