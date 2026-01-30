'use client';

import { useState, useEffect } from 'react';
import { Activity, Heart, Footprints, Moon, Plus, ArrowLeft, Watch, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function HealthTrackingPage() {
  const [healthData, setHealthData] = useState({
    steps: 0,
    heartRate: 0,
    sleep: 0,
    weight: 0,
  });
  const [connectedDevices, setConnectedDevices] = useState<string[]>([]);
  const [showAddDevice, setShowAddDevice] = useState(false);

  useEffect(() => {
    fetchHealthData();
    fetchConnectedDevices();
  }, []);

  const fetchHealthData = async () => {
    try {
      const response = await fetch(
        `/api/health/metrics`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      const data = await response.json();
      if (response.ok) {
        setHealthData(data.metrics || healthData);
      }
    } catch (error) {
      console.error('Failed to fetch health data');
    }
  };

  const fetchConnectedDevices = async () => {
    try {
      const response = await fetch(
        `/api/health/devices`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      const data = await response.json();
      if (response.ok) {
        setConnectedDevices(data.devices || []);
      }
    } catch (error) {
      console.error('Failed to fetch devices');
    }
  };

  const connectDevice = async (deviceType: string) => {
    try {
      const response = await fetch(
        `/api/health/devices/connect`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ deviceType }),
        }
      );

      if (response.ok) {
        toast.success(`${deviceType} connected successfully!`);
        fetchConnectedDevices();
        setShowAddDevice(false);
      } else {
        toast.error('Failed to connect device');
      }
    } catch (error) {
      toast.error('Connection error');
    }
  };

  const metrics = [
    {
      title: 'Steps',
      value: healthData.steps.toLocaleString(),
      icon: Footprints,
      color: 'blue',
      unit: 'steps today',
    },
    {
      title: 'Heart Rate',
      value: healthData.heartRate,
      icon: Heart,
      color: 'red',
      unit: 'bpm',
    },
    {
      title: 'Sleep',
      value: healthData.sleep,
      icon: Moon,
      color: 'purple',
      unit: 'hours',
    },
    {
      title: 'Weight',
      value: healthData.weight,
      icon: Activity,
      color: 'green',
      unit: 'kg',
    },
  ];

  const availableDevices = [
    { name: 'Apple Watch', type: 'apple_watch', icon: Watch },
    { name: 'Fitbit', type: 'fitbit', icon: Watch },
    { name: 'Google Fit', type: 'google_fit', icon: Smartphone },
    { name: 'Mi Band', type: 'mi_band', icon: Watch },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard/mother">
                <ArrowLeft className="w-5 h-5 text-gray-600 hover:text-gray-900 cursor-pointer" />
              </Link>
              <h1>Health Tracking</h1>
            </div>
            <button
              onClick={() => setShowAddDevice(true)}
              className="btn-primary flex items-center space-x-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Device</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Connected Devices */}
        {connectedDevices.length > 0 && (
          <div className="card mb-6">
            <h2 className="mb-3">Connected Devices</h2>
            <div className="flex flex-wrap gap-2">
              {connectedDevices.map((device, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 bg-green-50 border border-green-200 px-3 py-2 rounded-lg"
                >
                  <Watch className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">{device}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Health Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.title} className="card">
                <div className={`bg-${metric.color}-100 w-12 h-12 rounded-lg flex items-center justify-center mb-3`}>
                  <Icon className={`w-6 h-6 text-${metric.color}-600`} />
                </div>
                <p className="text-sm text-gray-600 mb-1">{metric.title}</p>
                <p className="text-2xl font-semibold">{metric.value}</p>
                <p className="text-xs text-gray-500 mt-1">{metric.unit}</p>
              </div>
            );
          })}
        </div>

        {/* Activity Timeline */}
        <div className="card">
          <h2 className="mb-4">Today's Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Footprints className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Morning Walk</p>
                  <p className="text-xs text-gray-600">8:00 AM</p>
                </div>
              </div>
              <span className="text-sm font-medium">2,500 steps</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Moon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Last Night's Sleep</p>
                  <p className="text-xs text-gray-600">10:00 PM - 6:00 AM</p>
                </div>
              </div>
              <span className="text-sm font-medium">8 hours</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Device Modal */}
      {showAddDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="mb-4">Connect Device</h2>
            <p className="text-sm text-gray-600 mb-6">
              Connect your wearable device to sync health data automatically
            </p>

            <div className="space-y-3 mb-6">
              {availableDevices.map((device) => {
                const Icon = device.icon;
                return (
                  <button
                    key={device.type}
                    onClick={() => connectDevice(device.name)}
                    className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-pink-300 transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-6 h-6 text-gray-600" />
                      <span className="font-medium">{device.name}</span>
                    </div>
                    <Plus className="w-5 h-5 text-gray-400" />
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowAddDevice(false)}
              className="btn-secondary w-full"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
