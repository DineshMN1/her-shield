'use client';

import { useState, useEffect } from 'react';
import {
  Building2, Users, Phone, Plus, Trash2, Settings, LogOut,
  Heart, AlertCircle, CheckCircle, Clock, UserPlus, Mail
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

export default function AdminDashboard() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [showAddDoctor, setShowAddDoctor] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  const [newOrg, setNewOrg] = useState({
    name: '',
    type: 'HOSPITAL',
    phone: '',
    email: '',
    city: '',
    emergencyPhone: '',
    emergencyWhatsApp: '',
    plan: 'FREE',
  });

  const [newDoctor, setNewDoctor] = useState({
    doctorName: '',
    doctorPhone: '',
    doctorEmail: '',
    specialization: '',
    isOnCall: false,
  });

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/organizations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOrganizations(data.organizations || []);
    } catch (error) {
      toast.error('Failed to fetch organizations');
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newOrg),
      });

      if (res.ok) {
        toast.success('Organization invited!');
        setNewOrg({ name: '', type: 'HOSPITAL', phone: '', email: '', city: '', emergencyPhone: '', emergencyWhatsApp: '', plan: 'FREE' });
        setShowAddOrg(false);
        fetchOrganizations();
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...newDoctor, organizationId: orgId }),
      });

      if (res.ok) {
        toast.success('Doctor added!');
        setNewDoctor({ doctorName: '', doctorPhone: '', doctorEmail: '', specialization: '', isOnCall: false });
        setShowAddDoctor(null);
        fetchOrganizations();
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
      fetchOrganizations();
    } catch (error) {
      toast.error('Failed to remove doctor');
    }
  };

  const handleDeleteOrg = async (orgId: string) => {
    if (!confirm('Delete this organization?')) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/admin/organizations?id=${orgId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Organization deleted');
      fetchOrganizations();
    } catch (error) {
      toast.error('Failed to delete organization');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
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
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Organizations</p>
                <p className="text-2xl font-bold">{organizations.length}</p>
              </div>
              <Building2 className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Doctors</p>
                <p className="text-2xl font-bold">
                  {organizations.reduce((acc, org) => acc + org._count.doctors, 0)}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">On-Call Doctors</p>
                <p className="text-2xl font-bold">
                  {organizations.reduce((acc, org) => acc + org.doctors.filter((d) => d.isOnCall).length, 0)}
                </p>
              </div>
              <Phone className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Emergency Calls</p>
                <p className="text-2xl font-bold">
                  {organizations.reduce((acc, org) => acc + org._count.emergencyCalls, 0)}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Add Organization Button */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Partner Organizations</h2>
          <button
            onClick={() => setShowAddOrg(true)}
            className="bg-pink-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-pink-700"
          >
            <Plus className="w-4 h-4" />
            <span>Invite Organization</span>
          </button>
        </div>

        {/* Organizations List */}
        <div className="space-y-4">
          {organizations.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No organizations yet. Invite hospitals like Apollo, Kaveri, Global, Chettinad.</p>
            </div>
          ) : (
            organizations.map((org) => (
              <div key={org.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <Building2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-lg">{org.name}</h3>
                        {org.isVerified && <CheckCircle className="w-4 h-4 text-green-500" />}
                        <span className={`px-2 py-0.5 rounded text-xs ${org.plan === 'PREMIUM' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                          {org.plan}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{org.type} • {org.city || 'Location not set'}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm">
                        <span className="flex items-center space-x-1 text-gray-600">
                          <Phone className="w-3 h-3" />
                          <span>{org.phone}</span>
                        </span>
                        {org.emergencyPhone && (
                          <span className="flex items-center space-x-1 text-red-600">
                            <AlertCircle className="w-3 h-3" />
                            <span>Emergency: {org.emergencyPhone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteOrg(org.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Doctors */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Doctors ({org.doctors.length})
                    </span>
                    <button
                      onClick={() => setShowAddDoctor(org.id)}
                      className="text-pink-600 text-sm flex items-center space-x-1 hover:text-pink-700"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Add Doctor</span>
                    </button>
                  </div>

                  {org.doctors.length === 0 ? (
                    <p className="text-sm text-gray-500">No doctors added yet</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {org.doctors.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{doc.doctorName}</p>
                            <p className="text-xs text-gray-500">
                              {doc.specialization || 'General'} • {doc.doctorPhone}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {doc.isOnCall && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                On-Call
                              </span>
                            )}
                            <button
                              onClick={() => handleDeleteDoctor(doc.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Organization Modal */}
      {showAddOrg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">Invite Organization</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Organization Name (e.g., Apollo Hospital)"
                value={newOrg.name}
                onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                className="w-full p-3 border rounded-lg"
              />
              <select
                value={newOrg.type}
                onChange={(e) => setNewOrg({ ...newOrg, type: e.target.value })}
                className="w-full p-3 border rounded-lg"
              >
                <option value="HOSPITAL">Hospital</option>
                <option value="CLINIC">Clinic</option>
                <option value="DIAGNOSTIC">Diagnostic Center</option>
              </select>
              <input
                type="text"
                placeholder="City"
                value={newOrg.city}
                onChange={(e) => setNewOrg({ ...newOrg, city: e.target.value })}
                className="w-full p-3 border rounded-lg"
              />
              <input
                type="tel"
                placeholder="Contact Phone"
                value={newOrg.phone}
                onChange={(e) => setNewOrg({ ...newOrg, phone: e.target.value })}
                className="w-full p-3 border rounded-lg"
              />
              <input
                type="email"
                placeholder="Email"
                value={newOrg.email}
                onChange={(e) => setNewOrg({ ...newOrg, email: e.target.value })}
                className="w-full p-3 border rounded-lg"
              />
              <input
                type="tel"
                placeholder="24/7 Emergency Phone"
                value={newOrg.emergencyPhone}
                onChange={(e) => setNewOrg({ ...newOrg, emergencyPhone: e.target.value })}
                className="w-full p-3 border rounded-lg"
              />
              <input
                type="tel"
                placeholder="Emergency WhatsApp Number"
                value={newOrg.emergencyWhatsApp}
                onChange={(e) => setNewOrg({ ...newOrg, emergencyWhatsApp: e.target.value })}
                className="w-full p-3 border rounded-lg"
              />
              <select
                value={newOrg.plan}
                onChange={(e) => setNewOrg({ ...newOrg, plan: e.target.value })}
                className="w-full p-3 border rounded-lg"
              >
                <option value="FREE">Free Plan</option>
                <option value="BASIC">Basic Plan</option>
                <option value="PREMIUM">Premium Plan</option>
              </select>
            </div>
            <div className="flex space-x-3 mt-4">
              <button onClick={() => setShowAddOrg(false)} className="flex-1 py-2 border rounded-lg">
                Cancel
              </button>
              <button onClick={handleAddOrganization} className="flex-1 py-2 bg-pink-600 text-white rounded-lg">
                Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Doctor Modal */}
      {showAddDoctor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-lg mb-4">Add Doctor</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Doctor Name"
                value={newDoctor.doctorName}
                onChange={(e) => setNewDoctor({ ...newDoctor, doctorName: e.target.value })}
                className="w-full p-3 border rounded-lg"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={newDoctor.doctorPhone}
                onChange={(e) => setNewDoctor({ ...newDoctor, doctorPhone: e.target.value })}
                className="w-full p-3 border rounded-lg"
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={newDoctor.doctorEmail}
                onChange={(e) => setNewDoctor({ ...newDoctor, doctorEmail: e.target.value })}
                className="w-full p-3 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Specialization (e.g., OB-GYN)"
                value={newDoctor.specialization}
                onChange={(e) => setNewDoctor({ ...newDoctor, specialization: e.target.value })}
                className="w-full p-3 border rounded-lg"
              />
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={newDoctor.isOnCall}
                  onChange={(e) => setNewDoctor({ ...newDoctor, isOnCall: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Available for emergency on-call</span>
              </label>
            </div>
            <div className="flex space-x-3 mt-4">
              <button onClick={() => setShowAddDoctor(null)} className="flex-1 py-2 border rounded-lg">
                Cancel
              </button>
              <button onClick={() => handleAddDoctor(showAddDoctor)} className="flex-1 py-2 bg-pink-600 text-white rounded-lg">
                Add Doctor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
