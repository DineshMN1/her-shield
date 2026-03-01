'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Building2, Users, Phone, Plus, Trash2, Settings, LogOut,
  Heart, AlertCircle, CheckCircle, UserPlus, X,
  Activity, Calendar, Pill, Shield, Search, ChevronDown, ChevronUp,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  type: string;
  phone: string;
  email?: string;
  city?: string;
  emergencyPhone?: string;
  emergencyWhatsApp?: string;
  isActive: boolean;
  isVerified: boolean;
  plan: string;
  doctors: OrganizationDoctor[];
  _count: { doctors: number; emergencyCalls: number };
}

interface OrganizationDoctor {
  id: string;
  doctorName: string;
  doctorPhone: string;
  doctorEmail?: string;
  specialization?: string;
  isOnCall: boolean;
}

interface Stats {
  totalUsers: number;
  totalPatients: number;
  totalDoctors: number;
  totalOrganizations: number;
  activeOrganizations: number;
  totalAppointments: number;
  scheduledAppointments: number;
  completedAppointments: number;
  totalEmergencyCalls: number;
  activeEmergencyCalls: number;
  totalPrescriptions: number;
  totalSOSAlerts: number;
}

interface RecentUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

type TabKey = 'overview' | 'organizations' | 'users' | 'emergency';

interface InstantMeetAlert {
  id: string;
  title: string;
  body: string;
  sentAt: string;
  data?: {
    roomLink?: string;
    roomId?: string;
    patientName?: string;
  };
}

function getInstantMeetJoinUrl(data?: InstantMeetAlert['data']) {
  if (!data) return undefined;
  if (data.roomId) return `https://meet.ffmuc.net/${encodeURIComponent(data.roomId)}`;
  return data.roomLink;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [showAddDoctor, setShowAddDoctor] = useState<string | null>(null);
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [searchUsers, setSearchUsers] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeInstantMeetAlert, setActiveInstantMeetAlert] = useState<InstantMeetAlert | null>(null);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());

  const [newOrg, setNewOrg] = useState({
    name: '', type: 'HOSPITAL', phone: '', email: '', city: '',
    emergencyPhone: '', emergencyWhatsApp: '', plan: 'FREE',
  });

  const [newDoctor, setNewDoctor] = useState({
    doctorName: '', doctorPhone: '', doctorEmail: '', specialization: '', isOnCall: false,
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    const playAlertSound = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const o1 = ctx.createOscillator();
        const o2 = ctx.createOscillator();
        const g = ctx.createGain();
        o1.type = 'square';
        o2.type = 'sine';
        o1.frequency.value = 740;
        o2.frequency.value = 880;
        g.gain.value = 0.0001;
        o1.connect(g);
        o2.connect(g);
        g.connect(ctx.destination);
        o1.start();
        o2.start();
        const now = ctx.currentTime;
        g.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        o1.stop(now + 0.5);
        o2.stop(now + 0.5);
      } catch {
        // ignore audio errors
      }
    };

    const pollInstantMeetNotifications = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

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
          title: fresh.title || 'Instant Meet Triggered',
          body: fresh.body || 'A patient has triggered instant meet.',
          sentAt: fresh.sentAt,
          data: (typeof fresh.data === 'object' && fresh.data) || {},
        };
        setActiveInstantMeetAlert(alert);
        toast.error('New Instant Meet request');
        playAlertSound();
      } catch {
        // ignore polling errors
      }
    };

    pollInstantMeetNotifications();
    const id = setInterval(pollInstantMeetNotifications, 7000);
    return () => clearInterval(id);
  }, []);

  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [orgRes, statsRes] = await Promise.all([
        fetch('/api/admin/organizations', { headers }),
        fetch('/api/admin/stats', { headers }),
      ]);

      if (orgRes.ok) {
        const orgData = await orgRes.json();
        setOrganizations(orgData.organizations || []);
      } else {
        console.error('Failed to fetch organizations', orgRes.status, orgRes.statusText);
        setOrganizations([]);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
        setRecentUsers(statsData.recentUsers || []);
      } else {
        console.error('Failed to fetch stats', statsRes.status, statsRes.statusText);
        setStats(null);
        setRecentUsers([]);
      }
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrganization = async () => {
    if (!newOrg.name || !newOrg.phone) {
      toast.error('Name and phone are required');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newOrg),
      });
      if (res.ok) {
        toast.success('Organization invited!');
        setNewOrg({ name: '', type: 'HOSPITAL', phone: '', email: '', city: '', emergencyPhone: '', emergencyWhatsApp: '', plan: 'FREE' });
        setShowAddOrg(false);
        fetchAllData();
      } else {
        const data = await res.json();
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Failed to add organization');
    }
  };

  const handleAddDoctor = async (orgId: string) => {
    if (!newDoctor.doctorName || !newDoctor.doctorPhone) {
      toast.error('Doctor name and phone are required');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/organizations/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...newDoctor, organizationId: orgId }),
      });
      if (res.ok) {
        toast.success('Doctor added!');
        setNewDoctor({ doctorName: '', doctorPhone: '', doctorEmail: '', specialization: '', isOnCall: false });
        setShowAddDoctor(null);
        fetchAllData();
      }
    } catch (error) {
      toast.error('Failed to add doctor');
    }
  };

  const handleDeleteDoctor = async (doctorId: string) => {
    if (!confirm('Remove this doctor?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/admin/organizations/doctors?id=${doctorId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Doctor removed');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to remove doctor');
    }
  };

  const handleDeleteOrg = async (orgId: string) => {
    if (!confirm('Delete this organization and all its doctors?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/admin/organizations?id=${orgId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Organization deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete organization');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const filteredUsers = recentUsers.filter((u) => {
    const matchesText = searchUsers
      ? `${u.firstName} ${u.lastName} ${u.email} ${u.phone}`.toLowerCase().includes(searchUsers.toLowerCase())
      : true;
    const matchesRole = roleFilter
      ? u.role && u.role.toLowerCase() === roleFilter.toLowerCase()
      : true;
    return matchesText && matchesRole;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {activeInstantMeetAlert && (
        <div className="fixed top-20 right-4 z-50 w-[380px] max-w-[92vw] bg-red-600 text-white rounded-xl shadow-2xl p-4 border border-red-500">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide opacity-90">Instant Meet Alert</p>
              <h3 className="font-bold">{activeInstantMeetAlert.title}</h3>
              <p className="text-sm mt-1 text-red-50">{activeInstantMeetAlert.body}</p>
              {activeInstantMeetAlert.data?.patientName && (
                <p className="text-xs mt-2 text-red-100">Patient: {activeInstantMeetAlert.data.patientName}</p>
              )}
            </div>
            <button
              onClick={() => setActiveInstantMeetAlert(null)}
              className="text-white/90 hover:text-white"
              aria-label="Dismiss instant meet alert"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {getInstantMeetJoinUrl(activeInstantMeetAlert.data) && (
            <a
              href={getInstantMeetJoinUrl(activeInstantMeetAlert.data)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center rounded-lg bg-white text-red-600 px-3 py-1.5 text-sm font-semibold"
            >
              Open Meet
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
              <p className="text-xs text-gray-500">Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/settings">
              <Settings className="w-5 h-5 text-gray-600 hover:text-gray-900" />
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
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600 text-sm">Manage platform, organizations, and users</p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-xs text-gray-400">{stats.totalPatients}P / {stats.totalDoctors}D</p>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Organizations</p>
                  <p className="text-2xl font-bold">{stats.totalOrganizations}</p>
                  <p className="text-xs text-gray-400">{stats.activeOrganizations} active</p>
                </div>
                <Building2 className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Appointments</p>
                  <p className="text-2xl font-bold">{stats.totalAppointments}</p>
                  <p className="text-xs text-gray-400">{stats.scheduledAppointments} upcoming</p>
                </div>
                <Calendar className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Emergency</p>
                  <p className="text-2xl font-bold">{stats.totalEmergencyCalls}</p>
                  <p className="text-xs text-gray-400">{stats.activeEmergencyCalls} active</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>
          </div>
        )}

        {/* Secondary Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl p-3 shadow-sm text-center">
              <Pill className="w-5 h-5 text-pink-500 mx-auto mb-1" />
              <p className="text-lg font-bold">{stats.totalPrescriptions}</p>
              <p className="text-xs text-gray-500">Prescriptions</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm text-center">
              <Activity className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-lg font-bold">{stats.completedAppointments}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm text-center">
              <Phone className="w-5 h-5 text-orange-500 mx-auto mb-1" />
              <p className="text-lg font-bold">
                {organizations.reduce((acc, org) => acc + org.doctors.filter((d) => d.isOnCall).length, 0)}
              </p>
              <p className="text-xs text-gray-500">On-Call</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 mb-6 shadow-sm overflow-x-auto">
          {([
            { key: 'overview', label: 'Overview' },
            { key: 'organizations', label: 'Organizations' },
            { key: 'users', label: 'Users' },
            { key: 'emergency', label: 'Emergency' },
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

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-bold">Recent Users</h3>
              </div>
              <div className="p-4">
                {recentUsers.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No users yet</p>
                ) : (
                  <div className="space-y-2">
                    {recentUsers.slice(0, 8).map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                            user.role === 'DOCTOR' ? 'bg-blue-100 text-blue-700' :
                            'bg-pink-100 text-pink-700'
                          }`}>
                            {user.firstName?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{user.firstName} {user.lastName}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            user.role === 'ADMIN' ? 'bg-purple-50 text-purple-600' :
                            user.role === 'DOCTOR' ? 'bg-blue-50 text-blue-600' :
                            'bg-pink-50 text-pink-600'
                          }`}>
                            {user.role}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(user.createdAt).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setActiveTab('organizations'); setShowAddOrg(true); }}
                className="bg-white rounded-xl p-4 shadow-sm text-left hover:shadow-md transition-shadow"
              >
                <Building2 className="w-6 h-6 text-blue-500 mb-2" />
                <p className="font-medium text-sm">Invite Organization</p>
                <p className="text-xs text-gray-500">Add hospitals/clinics</p>
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className="bg-white rounded-xl p-4 shadow-sm text-left hover:shadow-md transition-shadow"
              >
                <Users className="w-6 h-6 text-purple-500 mb-2" />
                <p className="font-medium text-sm">Manage Users</p>
                <p className="text-xs text-gray-500">View all users</p>
              </button>
            </div>
          </div>
        )}

        {/* Organizations Tab */}
        {activeTab === 'organizations' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-lg">Partner Organizations</h2>
              <button
                onClick={() => setShowAddOrg(true)}
                className="bg-pink-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-pink-700"
              >
                <Plus className="w-4 h-4" />
                Invite
              </button>
            </div>

            {organizations.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center shadow-sm">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No organizations yet. Invite hospitals like Apollo, Kaveri, Global, Chettinad.</p>
              </div>
            ) : (
              organizations.map((org) => (
                <div key={org.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedOrg(expandedOrg === org.id ? null : org.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-100 p-2.5 rounded-lg">
                          <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold">{org.name}</h3>
                            {org.isVerified && <CheckCircle className="w-4 h-4 text-green-500" />}
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              org.plan === 'PREMIUM' ? 'bg-purple-100 text-purple-700' :
                              org.plan === 'BASIC' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {org.plan}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">{org.type} - {org.city || 'Location not set'}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <span>{org.phone}</span>
                            <span>{org._count.doctors} doctors</span>
                            <span>{org._count.emergencyCalls} calls</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteOrg(org.id); }}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {expandedOrg === org.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </div>
                    </div>
                  </div>

                  {expandedOrg === org.id && (
                    <div className="border-t border-gray-100 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">Doctors ({org.doctors.length})</span>
                        <button
                          onClick={() => setShowAddDoctor(org.id)}
                          className="text-pink-600 text-sm flex items-center gap-1 hover:text-pink-700"
                        >
                          <UserPlus className="w-4 h-4" /> Add Doctor
                        </button>
                      </div>

                      {org.doctors.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-3">No doctors added yet</p>
                      ) : (
                        <div className="space-y-2">
                          {org.doctors.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium text-sm">{doc.doctorName}</p>
                                <p className="text-xs text-gray-500">
                                  {doc.specialization || 'General'} - {doc.doctorPhone}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  doc.isOnCall ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {doc.isOnCall ? 'On-Call' : 'Off'}
                                </span>
                                <button onClick={() => handleDeleteDoctor(doc.id)} className="text-red-400 hover:text-red-600">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {org.emergencyPhone && (
                        <div className="mt-3 p-2 bg-red-50 rounded-lg">
                          <p className="text-xs text-red-600 font-medium">
                            Emergency: {org.emergencyPhone}
                            {org.emergencyWhatsApp && ` | WhatsApp: ${org.emergencyWhatsApp}`}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <h2 className="font-bold text-lg">Platform Users</h2>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchUsers}
                onChange={(e) => setSearchUsers(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl text-sm"
              />
            </div>
            <div className="flex gap-2">
              {['All', 'PATIENT', 'DOCTOR', 'ADMIN'].map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role === 'All' ? '' : role)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                    (role === 'All' && !roleFilter) || roleFilter === role
                      ? 'bg-pink-600 text-white' : 'bg-white text-gray-600 border'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
            {filteredUsers.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center shadow-sm">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No users found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                          user.role === 'DOCTOR' ? 'bg-blue-100 text-blue-700' :
                          'bg-pink-100 text-pink-700'
                        }`}>
                          {user.role === 'ADMIN' ? <Shield className="w-5 h-5" /> : user.firstName?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-gray-500">{user.email} - {user.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          user.role === 'ADMIN' ? 'bg-purple-50 text-purple-600' :
                          user.role === 'DOCTOR' ? 'bg-blue-50 text-blue-600' :
                          'bg-pink-50 text-pink-600'
                        }`}>{user.role}</span>
                        <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Emergency Tab */}
        {activeTab === 'emergency' && (
          <div className="space-y-4">
            <h2 className="font-bold text-lg">Emergency Overview</h2>
            {stats && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-sm text-red-600 font-medium">Active Emergency</p>
                  <p className="text-3xl font-bold text-red-700">{stats.activeEmergencyCalls}</p>
                  <p className="text-xs text-red-500">Calls waiting/escalated</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4">
                  <p className="text-sm text-orange-600 font-medium">SOS Alerts</p>
                  <p className="text-3xl font-bold text-orange-700">{stats.totalSOSAlerts}</p>
                  <p className="text-xs text-orange-500">Total alerts triggered</p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-bold">On-Call Doctors</h3>
              </div>
              <div className="p-4">
                {organizations.flatMap((org) =>
                  org.doctors.filter((d) => d.isOnCall).map((d) => ({ ...d, orgName: org.name }))
                ).length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No doctors currently on-call</p>
                ) : (
                  <div className="space-y-2">
                    {organizations.flatMap((org) =>
                      org.doctors.filter((d) => d.isOnCall).map((d) => (
                        <div key={d.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{d.doctorName}</p>
                            <p className="text-xs text-gray-500">{org.name} - {d.specialization || 'General'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-green-600">{d.doctorPhone}</span>
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">ON-CALL</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-bold">Organization Emergency Lines</h3>
              </div>
              <div className="p-4 space-y-2">
                {organizations.filter((o) => o.emergencyPhone).length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No emergency lines configured</p>
                ) : (
                  organizations.filter((o) => o.emergencyPhone).map((org) => (
                    <div key={org.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{org.name}</p>
                        <p className="text-xs text-gray-500">{org.type} - {org.city}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-red-600">{org.emergencyPhone}</p>
                        {org.emergencyWhatsApp && (
                          <p className="text-xs text-green-600">WA: {org.emergencyWhatsApp}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Organization Modal */}
      {showAddOrg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Invite Organization</h3>
              <button onClick={() => setShowAddOrg(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Organization Name (e.g., Apollo Hospital)" value={newOrg.name} onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })} className="w-full p-3 border rounded-lg text-sm" />
              <select value={newOrg.type} onChange={(e) => setNewOrg({ ...newOrg, type: e.target.value })} className="w-full p-3 border rounded-lg text-sm">
                <option value="HOSPITAL">Hospital</option>
                <option value="CLINIC">Clinic</option>
                <option value="DIAGNOSTIC">Diagnostic Center</option>
              </select>
              <input type="text" placeholder="City" value={newOrg.city} onChange={(e) => setNewOrg({ ...newOrg, city: e.target.value })} className="w-full p-3 border rounded-lg text-sm" />
              <input type="tel" placeholder="Contact Phone" value={newOrg.phone} onChange={(e) => setNewOrg({ ...newOrg, phone: e.target.value })} className="w-full p-3 border rounded-lg text-sm" />
              <input type="email" placeholder="Email" value={newOrg.email} onChange={(e) => setNewOrg({ ...newOrg, email: e.target.value })} className="w-full p-3 border rounded-lg text-sm" />
              <input type="tel" placeholder="24/7 Emergency Phone" value={newOrg.emergencyPhone} onChange={(e) => setNewOrg({ ...newOrg, emergencyPhone: e.target.value })} className="w-full p-3 border rounded-lg text-sm" />
              <input type="tel" placeholder="Emergency WhatsApp" value={newOrg.emergencyWhatsApp} onChange={(e) => setNewOrg({ ...newOrg, emergencyWhatsApp: e.target.value })} className="w-full p-3 border rounded-lg text-sm" />
              <select value={newOrg.plan} onChange={(e) => setNewOrg({ ...newOrg, plan: e.target.value })} className="w-full p-3 border rounded-lg text-sm">
                <option value="FREE">Free Plan</option>
                <option value="BASIC">Basic Plan</option>
                <option value="PREMIUM">Premium Plan</option>
              </select>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowAddOrg(false)} className="flex-1 py-2.5 border rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleAddOrganization} className="flex-1 py-2.5 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700">Invite</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Doctor Modal */}
      {showAddDoctor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Add Doctor</h3>
              <button onClick={() => setShowAddDoctor(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Doctor Name" value={newDoctor.doctorName} onChange={(e) => setNewDoctor({ ...newDoctor, doctorName: e.target.value })} className="w-full p-3 border rounded-lg text-sm" />
              <input type="tel" placeholder="Phone Number" value={newDoctor.doctorPhone} onChange={(e) => setNewDoctor({ ...newDoctor, doctorPhone: e.target.value })} className="w-full p-3 border rounded-lg text-sm" />
              <input type="email" placeholder="Email (optional)" value={newDoctor.doctorEmail} onChange={(e) => setNewDoctor({ ...newDoctor, doctorEmail: e.target.value })} className="w-full p-3 border rounded-lg text-sm" />
              <input type="text" placeholder="Specialization (e.g., OB-GYN)" value={newDoctor.specialization} onChange={(e) => setNewDoctor({ ...newDoctor, specialization: e.target.value })} className="w-full p-3 border rounded-lg text-sm" />
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={newDoctor.isOnCall} onChange={(e) => setNewDoctor({ ...newDoctor, isOnCall: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm">Available for emergency on-call</span>
              </label>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowAddDoctor(null)} className="flex-1 py-2.5 border rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={() => handleAddDoctor(showAddDoctor)} className="flex-1 py-2.5 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700">Add Doctor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
