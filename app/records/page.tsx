'use client';

import { useState, useEffect } from 'react';
import { FileText, Pill, Camera, Plus, ArrowLeft, Calendar } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function MedicalRecordsPage() {
  const [activeTab, setActiveTab] = useState<'prescriptions' | 'scans'>('prescriptions');
  const [prescriptions, setPrescriptions] = useState([]);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    const token = localStorage.getItem('token');
    try {
      const [prescRes, scansRes] = await Promise.all([
        fetch(`/api/medical-records/prescriptions/my`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/medical-records/scans`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const prescData = await prescRes.json();
      const scansData = await scansRes.json();

      setPrescriptions(prescData.prescriptions || []);
      setScans(scansData.scans || []);
    } catch (error) {
      toast.error('Failed to fetch records');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard/mother">
                <ArrowLeft className="w-5 h-5 text-gray-600 hover:text-gray-900 cursor-pointer" />
              </Link>
              <h1>Medical Records</h1>
            </div>
            <Link href="/records/upload" className="btn-primary flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Upload Scan</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setActiveTab('prescriptions')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'prescriptions'
                ? 'bg-pink-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Pill className="w-4 h-4" />
            <span>Prescriptions</span>
          </button>
          <button
            onClick={() => setActiveTab('scans')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'scans'
                ? 'bg-pink-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Scans & Reports</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
          </div>
        ) : activeTab === 'prescriptions' ? (
          <div className="space-y-4">
            {prescriptions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl">
                <Pill className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No prescriptions yet</p>
              </div>
            ) : (
              prescriptions.map((presc: any) => (
                <Link
                  key={presc.id}
                  href={`/records/prescription/${presc.appointment.id}`}
                  className="card block hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <Pill className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{presc.diagnosis}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Dr. {presc.appointment.doctor?.firstName} {presc.appointment.doctor?.lastName}
                        </p>
                        <div className="flex items-center space-x-1 mt-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(presc.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      {(presc.medicines as any[])?.length || 0} medicines
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {scans.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl">
                <Camera className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">No scans uploaded</p>
                <Link href="/records/upload" className="btn-primary inline-block">
                  Upload Your First Scan
                </Link>
              </div>
            ) : (
              scans.map((scan: any) => (
                <Link
                  key={scan.id}
                  href={`/records/scan/${scan.id}`}
                  className="card block hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="bg-purple-100 p-3 rounded-lg">
                        <FileText className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{scan.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{scan.scanType}</p>
                        <div className="flex items-center space-x-1 mt-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(scan.scanDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      scan.fileType.includes('pdf')
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {scan.fileType.includes('pdf') ? 'PDF' : 'Image'}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
