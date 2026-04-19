'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Heart, Calendar, Users, Video, Settings, LogOut, Clock, Pill,
  Search, Plus, ChevronRight, Activity, X, Loader, Zap,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRequireDoctor } from '@/lib/useAuth';
import { buildJitsiJoinUrl } from '@/lib/jitsi';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  pregnancyWeek?: number;
  dueDate?: string;
}

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  date?: string;
  time: string;
  scheduledAt?: string;
  status: string;
  type: string;
  reason: string;
  hasPrescription?: boolean;
}

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

const COMMON_MEDICINES = [
  'Paracetamol', 'Folic Acid', 'Iron + Folic Acid', 'Calcium + Vitamin D3',
  'Vitamin B12', 'Omeprazole', 'Pantoprazole', 'Ondansetron',
  'Doxylamine + B6', 'Progesterone',
];
const DOSAGE_OPTIONS = ['250mg', '500mg', '650mg', '1g', '5mg', '10mg', '20mg', '40mg'];
const FREQUENCY_OPTIONS = ['Once daily', 'Twice daily', 'Thrice daily', 'Every 8 hours', 'Before bed', 'As needed'];
const DURATION_OPTIONS = ['3 days', '5 days', '7 days', '10 days', '14 days', '1 month', '3 months'];
const INSTRUCTION_OPTIONS = ['Before food', 'After food', 'With food', 'Empty stomach', 'With milk'];

type TabKey = 'today' | 'patients' | 'appointments';

interface InstantMeetAlert {
  id: string;
  title: string;
  body: string;
  sentAt: string;
  data?: {
    roomLink?: string;
    roomId?: string;
    patientName?: string;
    appointmentId?: string;
  };
}

function getInstantMeetJoinUrl(data?: InstantMeetAlert['data'], displayName = 'Doctor') {
  if (!data) return undefined;
  if (data.appointmentId) return `/video/${data.appointmentId}`;
  if (data.roomId) return buildJitsiJoinUrl(data.roomId, displayName);
  if (data.roomLink) return buildJitsiJoinUrl(data.roomLink, displayName);
  return undefined;
}

export default function DoctorDashboard() {
  const { user, loading: authLoading, logout } = useRequireDoctor();
  const displayName = user ? `Dr. ${user.firstName} ${user.lastName}`.trim() : 'Doctor';
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Prescribe modal
  const [showPrescribeModal, setShowPrescribeModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [prescDiagnosis, setPrescDiagnosis] = useState('');
  const [prescAdvice, setPrescAdvice] = useState('');
  const [prescFollowUp, setPrescFollowUp] = useState('');
  const [prescMedicines, setPrescMedicines] = useState<Medicine[]>([
    { name: '', dosage: '', frequency: '', duration: '', instructions: '' },
  ]);
  const [prescribing, setPrescribing] = useState(false);

  // Schedule modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulePatient, setSchedulePatient] = useState<Patient | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleType, setScheduleType] = useState('VIDEO');
  const [scheduleReason, setScheduleReason] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [activeInstantMeetAlert, setActiveInstantMeetAlert] = useState<InstantMeetAlert | null>(null);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const playAlertSound = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const o1 = ctx.createOscillator();
        const o2 = ctx.createOscillator();
        const g = ctx.createGain();
        o1.type = 'sine';
        o2.type = 'sine';
        o1.frequency.value = 880;
        o2.frequency.value = 660;
        g.gain.value = 0.0001;
        o1.connect(g);
        o2.connect(g);
        g.connect(ctx.destination);
        o1.start();
        o2.start();
        const now = ctx.currentTime;
        g.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
        o1.stop(now + 0.45);
        o2.stop(now + 0.45);
      } catch {
        // ignore audio errors
      }
    };

    const pollInstantMeetNotifications = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/notifications?unreadOnly=1&type=INSTANT_MEET&take=10', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!res.ok) return;

        const data = await res.json();
        const notifications = Array.isArray(data.notifications) ? data.notifications : [];
        if (notifications.length === 0) return;

        const fresh = notifications.find((n: any) => !seenNotificationIdsRef.current.has(n.id));
        notifications.forEach((n: any) => seenNotificationIdsRef.current.add(n.id));

        await fetch('/api/notifications', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ids: notifications.map((n: any) => n.id) }),
        }).catch(() => null);

        if (!fresh) return;

        const alert: InstantMeetAlert = {
          id: fresh.id,
          title: fresh.title || 'Instant Meet Request',
          body: fresh.body || 'A patient is requesting an immediate consultation.',
          sentAt: fresh.sentAt,
          data: (typeof fresh.data === 'object' && fresh.data) || {},
        };

        setActiveInstantMeetAlert(alert);
        toast.error('Instant Meet request received');
        playAlertSound();
      } catch {
        // ignore polling errors
      }
    };

    pollInstantMeetNotifications();
    const id = setInterval(pollInstantMeetNotifications, 7000);
    return () => clearInterval(id);
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [todayRes, patientsRes, allApptRes] = await Promise.all([
        fetch('/api/appointments/doctor/today', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/users/patients', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/appointments/doctor/all', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!todayRes.ok) {
        console.error('Failed to fetch today appointments', todayRes.status, todayRes.statusText);
        setTodayAppointments([]);
      } else {
        const todayData = await todayRes.json();
        setTodayAppointments(todayData.appointments || []);
      }

      if (!patientsRes.ok) {
        console.error('Failed to fetch patients', patientsRes.status, patientsRes.statusText);
        setPatients([]);
      } else {
        const patientData = await patientsRes.json();
        setPatients(patientData.patients || []);
      }

      if (!allApptRes.ok) {
        console.error('Failed to fetch all appointments', allApptRes.status, allApptRes.statusText);
        setAllAppointments([]);
      } else {
        const allApptData = await allApptRes.json();
        setAllAppointments(allApptData.appointments || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDirectPrescribe = async () => {
    if (!selectedPatient || !prescDiagnosis) {
      toast.error('Select a patient and enter diagnosis');
      return;
    }
    const validMedicines = prescMedicines.filter((m) => m.name.trim());
    if (validMedicines.length === 0) {
      toast.error('Add at least one medicine');
      return;
    }

    setPrescribing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/prescriptions/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          diagnosis: prescDiagnosis,
          medicines: validMedicines,
          advice: prescAdvice,
          followUpDate: prescFollowUp || undefined,
        }),
      });

      if (res.ok) {
        toast.success('Prescription sent to patient!');
        closePrescribeModal();
        fetchDashboardData();
      } else {
        const data = await res.json();
        toast.error(data.message || 'Failed to create prescription');
      }
    } catch (error) {
      toast.error('Failed to create prescription');
    } finally {
      setPrescribing(false);
    }
  };

  const handleScheduleAppointment = async () => {
    if (!schedulePatient || !scheduleDate || !scheduleTime) {
      toast.error('Fill all required fields');
      return;
    }

    setScheduling(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          doctorId: user?.id,
          patientId: schedulePatient.id,
          date: scheduleDate,
          time: scheduleTime,
          type: scheduleType,
          reason: scheduleReason || 'Doctor scheduled appointment',
        }),
      });

      if (res.ok) {
        toast.success('Appointment scheduled!');
        closeScheduleModal();
        fetchDashboardData();
      } else {
        const data = await res.json();
        toast.error(data.message || 'Failed to schedule');
      }
    } catch (error) {
      toast.error('Failed to schedule appointment');
    } finally {
      setScheduling(false);
    }
  };

  const closePrescribeModal = () => {
    setShowPrescribeModal(false);
    setSelectedPatient(null);
    setPrescDiagnosis('');
    setPrescAdvice('');
    setPrescFollowUp('');
    setPrescMedicines([{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  };

  const closeScheduleModal = () => {
    setShowScheduleModal(false);
    setSchedulePatient(null);
    setScheduleDate('');
    setScheduleTime('');
    setScheduleType('VIDEO');
    setScheduleReason('');
  };

  const openPrescribeForPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowPrescribeModal(true);
  };

  const openScheduleForPatient = (patient: Patient) => {
    setSchedulePatient(patient);
    setShowScheduleModal(true);
  };

  const addMedicine = () => {
    setPrescMedicines([...prescMedicines, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  };

  const updateMedicine = (index: number, field: keyof Medicine, value: string) => {
    const updated = [...prescMedicines];
    // Create a new object for the specific index
    updated[index] = { ...updated[index], [field]: value };
    setPrescMedicines(updated);
  };

  const removeMedicine = (index: number) => {
    if (prescMedicines.length > 1) {
      setPrescMedicines(prescMedicines.filter((_, i) => i !== index));
    }
  };

  const addQuickMedicine = (name: string) => {
    const emptyIdx = prescMedicines.findIndex((m) => !m.name.trim());
    if (emptyIdx !== -1) {
      const updated = [...prescMedicines];
      // Create a new object for the empty index
      updated[emptyIdx] = { ...updated[emptyIdx], name };
      setPrescMedicines(updated);
    } else {
      setPrescMedicines([...prescMedicines, { name, dosage: '', frequency: '', duration: '', instructions: '' }]);
    }
  };

  const filteredPatients = patients.filter((p) =>
    searchQuery
      ? `${p.firstName} ${p.lastName} ${p.phone} ${p.email}`.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const handleLogout = () => {
    toast.success('Logged out successfully');
    logout();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {activeInstantMeetAlert && (
        <div className="fixed top-20 right-4 z-50 w-[360px] max-w-[92vw] bg-red-600 text-white rounded-xl shadow-2xl p-4 border border-red-500">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide opacity-90">Emergency</p>
              <div className="flex items-center gap-2">
                <h3 className="font-bold">{activeInstantMeetAlert.title}</h3>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  activeInstantMeetAlert.data?.appointmentId
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {activeInstantMeetAlert.data?.appointmentId ? 'Assigned' : 'Waiting'}
                </span>
              </div>
              <p className="text-sm mt-1 text-red-50">{activeInstantMeetAlert.body}</p>
              {activeInstantMeetAlert.data?.patientName && (
                <p className="text-xs mt-2 text-red-100">Patient: {activeInstantMeetAlert.data.patientName}</p>
              )}
              <p className="text-xs mt-1 text-red-100">
                {activeInstantMeetAlert.data?.appointmentId
                  ? 'The shared appointment is ready. Join the video page now.'
                  : 'The request is waiting for admin assignment. A shared appointment will appear once the doctor is transferred.'}
              </p>
            </div>
            <button
              onClick={() => setActiveInstantMeetAlert(null)}
              className="text-white/90 hover:text-white"
              aria-label="Dismiss instant meet alert"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {getInstantMeetJoinUrl(activeInstantMeetAlert.data, displayName) && (
            <a
              href={getInstantMeetJoinUrl(activeInstantMeetAlert.data, displayName)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center rounded-lg bg-white text-red-600 px-3 py-1.5 text-sm font-semibold"
            >
              Join Meet
            </a>
          )}
        </div>
      )}
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-2 rounded-lg">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold">Health SOS</h2>
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
          <h1 className="text-xl font-bold">Welcome, Dr. {user?.firstName}!</h1>
          <p className="text-gray-600 text-sm">Manage your patients and schedule</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Today</p>
                <p className="text-2xl font-bold">{todayAppointments.length}</p>
              </div>
              <div className="bg-blue-100 p-2 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Patients</p>
                <p className="text-2xl font-bold">{patients.length}</p>
              </div>
              <div className="bg-purple-100 p-2 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Video Calls</p>
                <p className="text-2xl font-bold">
                  {todayAppointments.filter((a) => a.type === 'VIDEO').length}
                </p>
              </div>
              <div className="bg-green-100 p-2 rounded-lg">
                <Video className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Visits</p>
                <p className="text-2xl font-bold">{allAppointments.length}</p>
              </div>
              <div className="bg-orange-100 p-2 rounded-lg">
                <Activity className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 mb-6 shadow-sm overflow-x-auto">
          {([
            { key: 'today', label: "Today's Schedule" },
            { key: 'patients', label: 'All Patients' },
            { key: 'appointments', label: 'All Appointments' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Today's Schedule */}
        {activeTab === 'today' && (
          <div className="space-y-4">
            {todayAppointments.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center shadow-sm">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No appointments scheduled for today</p>
                <button
                  onClick={() => setActiveTab('patients')}
                  className="mt-3 text-pink-600 text-sm hover:underline"
                >
                  View patients to schedule
                </button>
              </div>
            ) : (
              todayAppointments.map((apt) => (
                <div key={apt.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${apt.type === 'VIDEO' ? 'bg-blue-100' : 'bg-green-100'}`}>
                        {apt.type === 'VIDEO' ? (
                          <Video className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Users className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{apt.patientName}</p>
                        <p className="text-xs text-gray-500">{apt.reason || apt.type} - {apt.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {apt.type === 'VIDEO' && apt.status === 'SCHEDULED' && (
                        <Link
                          href={`/video/${apt.id}`}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 flex items-center gap-1"
                        >
                          <Video className="w-3.5 h-3.5" />
                          Join
                        </Link>
                      )}
                      <Link
                        href={`/appointment/${apt.id}/prescription`}
                        className="bg-pink-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-pink-700 flex items-center gap-1"
                      >
                        <Pill className="w-3.5 h-3.5" />
                        Prescribe
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* All Patients */}
        {activeTab === 'patients' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search patients by name, phone, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl text-sm"
              />
            </div>

            {filteredPatients.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center shadow-sm">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">
                  {searchQuery ? 'No patients match your search' : 'No patients yet'}
                </p>
              </div>
            ) : (
              filteredPatients.map((patient) => (
                <div key={patient.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-100 w-10 h-10 rounded-full flex items-center justify-center">
                        <span className="text-purple-700 font-bold text-sm">
                          {patient.firstName?.charAt(0) || 'P'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{patient.firstName} {patient.lastName}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{patient.phone}</span>
                          {patient.pregnancyWeek && (
                            <span className="bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded">
                              Week {patient.pregnancyWeek}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openPrescribeForPatient(patient)}
                        className="bg-pink-50 text-pink-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-pink-100 flex items-center gap-1"
                      >
                        <Pill className="w-3.5 h-3.5" />
                        Prescribe
                      </button>
                      <button
                        onClick={() => openScheduleForPatient(patient)}
                        className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-100 flex items-center gap-1"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        Schedule
                      </button>
                      <Link
                        href={`/patients/${patient.id}`}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* All Appointments */}
        {activeTab === 'appointments' && (
          <div className="space-y-3">
            {allAppointments.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center shadow-sm">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No appointment history</p>
              </div>
            ) : (
              allAppointments.map((apt) => (
                <div key={apt.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-10 rounded-full ${
                        apt.status === 'COMPLETED' ? 'bg-green-500' :
                        apt.status === 'SCHEDULED' ? 'bg-blue-500' :
                        apt.status === 'CANCELLED' ? 'bg-red-500' : 'bg-gray-300'
                      }`} />
                      <div>
                        <p className="font-medium text-sm">{apt.patientName}</p>
                        <p className="text-xs text-gray-500">
                          {apt.scheduledAt && new Date(apt.scheduledAt).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })} - {apt.time}
                        </p>
                        {apt.reason && (
                          <p className="text-xs text-gray-400 mt-0.5">{apt.reason}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        apt.status === 'COMPLETED' ? 'bg-green-50 text-green-600' :
                        apt.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-600' :
                        apt.status === 'CANCELLED' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'
                      }`}>
                        {apt.status}
                      </span>
                      {apt.type === 'VIDEO' && apt.status === 'SCHEDULED' && (
                        <Link
                          href={`/video/${apt.id}`}
                          className="bg-blue-600 text-white px-2 py-1 rounded-lg text-xs hover:bg-blue-700"
                        >
                          Join
                        </Link>
                      )}
                      {!apt.hasPrescription && (
                        <Link
                          href={`/appointment/${apt.id}/prescription`}
                          className="text-pink-600 text-xs hover:underline"
                        >
                          Prescribe
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Direct Prescribe Modal */}
      {showPrescribeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between rounded-t-xl">
              <div>
                <h3 className="font-bold text-lg">Quick Prescribe</h3>
                {selectedPatient && (
                  <p className="text-sm text-gray-500">
                    For: {selectedPatient.firstName} {selectedPatient.lastName}
                  </p>
                )}
              </div>
              <button onClick={closePrescribeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Diagnosis */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis *</label>
                <textarea
                  value={prescDiagnosis}
                  onChange={(e) => setPrescDiagnosis(e.target.value)}
                  className="w-full p-3 border rounded-lg text-sm resize-none"
                  rows={2}
                  placeholder="Enter diagnosis..."
                />
              </div>

              {/* Quick Add */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-yellow-500" /> Quick Add
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_MEDICINES.map((med) => (
                    <button
                      key={med}
                      type="button"
                      onClick={() => addQuickMedicine(med)}
                      className="px-2 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-full text-xs"
                    >
                      + {med}
                    </button>
                  ))}
                </div>
              </div>

              {/* Medicines */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Medicines ({prescMedicines.filter((m) => m.name).length})
                  </label>
                  <button onClick={addMedicine} className="text-pink-600 text-xs flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Row
                  </button>
                </div>
                {prescMedicines.map((med, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3 mb-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2 flex gap-2">
                        <input
                          type="text"
                          placeholder="Medicine name"
                          value={med.name}
                          onChange={(e) => updateMedicine(idx, 'name', e.target.value)}
                          className="flex-1 p-2 border rounded-lg text-sm"
                          list={`modal-med-${idx}`}
                        />
                        <datalist id={`modal-med-${idx}`}>
                          {COMMON_MEDICINES.map((m) => <option key={m} value={m} />)}
                        </datalist>
                        {prescMedicines.length > 1 && (
                          <button onClick={() => removeMedicine(idx)} className="text-red-400 hover:text-red-600 px-1">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <select value={med.dosage} onChange={(e) => updateMedicine(idx, 'dosage', e.target.value)} className="p-2 border rounded-lg text-xs">
                        <option value="">Dosage</option>
                        {DOSAGE_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select value={med.frequency} onChange={(e) => updateMedicine(idx, 'frequency', e.target.value)} className="p-2 border rounded-lg text-xs">
                        <option value="">Frequency</option>
                        {FREQUENCY_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                      <select value={med.duration} onChange={(e) => updateMedicine(idx, 'duration', e.target.value)} className="p-2 border rounded-lg text-xs">
                        <option value="">Duration</option>
                        {DURATION_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select value={med.instructions} onChange={(e) => updateMedicine(idx, 'instructions', e.target.value)} className="p-2 border rounded-lg text-xs">
                        <option value="">Instructions</option>
                        {INSTRUCTION_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {/* Advice */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Advice</label>
                <textarea
                  value={prescAdvice}
                  onChange={(e) => setPrescAdvice(e.target.value)}
                  className="w-full p-3 border rounded-lg text-sm resize-none"
                  rows={2}
                  placeholder="Additional advice..."
                />
              </div>

              {/* Follow-up */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date</label>
                <input
                  type="date"
                  value={prescFollowUp}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setPrescFollowUp(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white p-4 border-t flex gap-3 rounded-b-xl">
              <button onClick={closePrescribeModal} className="flex-1 py-2.5 border rounded-lg text-sm font-medium">
                Cancel
              </button>
              <button
                onClick={handleDirectPrescribe}
                disabled={prescribing}
                className="flex-1 py-2.5 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {prescribing ? <Loader className="w-4 h-4 animate-spin" /> : <Pill className="w-4 h-4" />}
                Send Prescription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Appointment Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg">Schedule Appointment</h3>
                {schedulePatient && (
                  <p className="text-sm text-gray-500">
                    For: {schedulePatient.firstName} {schedulePatient.lastName}
                  </p>
                )}
              </div>
              <button onClick={closeScheduleModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={scheduleDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full p-3 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full p-3 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={scheduleType}
                  onChange={(e) => setScheduleType(e.target.value)}
                  className="w-full p-3 border rounded-lg text-sm"
                >
                  <option value="VIDEO">Video Consultation</option>
                  <option value="CLINIC">Clinic Visit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <input
                  type="text"
                  value={scheduleReason}
                  onChange={(e) => setScheduleReason(e.target.value)}
                  placeholder="Reason for appointment..."
                  className="w-full p-3 border rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={closeScheduleModal} className="flex-1 py-2.5 border rounded-lg text-sm font-medium">
                Cancel
              </button>
              <button
                onClick={handleScheduleAppointment}
                disabled={scheduling}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {scheduling ? <Loader className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
