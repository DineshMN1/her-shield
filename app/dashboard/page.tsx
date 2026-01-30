'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle, Video, MessageCircle, Heart, Calendar, Activity, 
  Bell, Settings, LogOut, Pill, Clock, TrendingUp, Users, Phone
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userData));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="glass sticky top-0 z-50">
        <div className="container mx-auto px-4 py-5 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-pink-500 to-purple-600 p-3 rounded-2xl">
              <Heart className="text-white" size={28} />
            </div>
            <span className="text-2xl font-black gradient-text">Health SOS</span>
          </Link>
          <div className="flex items-center gap-4">
            <button className="relative p-3 rounded-xl hover:bg-pink-50 transition-all">
              <Bell size={24} className="text-gray-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <Link href="/settings">
              <button className="p-3 rounded-xl hover:bg-pink-50 transition-all">
                <Settings size={24} className="text-gray-600" />
              </button>
            </Link>
            <button onClick={handleLogout} className="p-3 rounded-xl hover:bg-red-50 transition-all">
              <LogOut size={24} className="text-red-500" />
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-gradient mb-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-pink-300 rounded-full filter blur-3xl opacity-20"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-black gradient-text mb-2">
                  Welcome back, {user.firstName}! 👋
                </h1>
                <p className="text-xl text-gray-600">
                  {user.role === 'PATIENT'
                    ? 'Your health journey continues here'
                    : 'Ready to help patients today'}
                </p>
              </div>
              <div className="hidden md:block">
                <div className="text-right">
                  <div className="text-sm text-gray-500 mb-1">Today's Date</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>
              </div>
            </div>

            {user.role === 'PATIENT' && (
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4">
                  <div className="text-sm text-gray-600 mb-1">Pregnancy Week</div>
                  <div className="text-3xl font-black text-pink-500">24</div>
                </div>
                <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4">
                  <div className="text-sm text-gray-600 mb-1">Days to Go</div>
                  <div className="text-3xl font-black text-purple-500">112</div>
                </div>
                <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4">
                  <div className="text-sm text-gray-600 mb-1">Next Checkup</div>
                  <div className="text-3xl font-black text-blue-500">5</div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickActions.map((action, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="hover-lift"
            >
              <Link href={action.href}>
                <div className={`${action.gradient} p-6 rounded-3xl shadow-2xl text-white relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative z-10">
                    <div className="mb-4">{action.icon}</div>
                    <h3 className="text-xl font-black mb-2">{action.title}</h3>
                    <p className="text-sm opacity-90">{action.description}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Upcoming */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Appointments */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-gray-800">Upcoming Appointments</h2>
                <Link href="/appointments">
                  <button className="text-pink-500 font-bold hover:underline">View All</button>
                </Link>
              </div>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl">
                    <div className="bg-white p-3 rounded-xl">
                      <Calendar className="text-pink-500" size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800">Dr. Sarah Johnson</h4>
                      <p className="text-sm text-gray-600">Prenatal Checkup</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-800">Oct {15 + i}</div>
                      <div className="text-sm text-gray-600">10:00 AM</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Health Metrics */}
            <div className="card">
              <h2 className="text-2xl font-black text-gray-800 mb-6">Health Metrics</h2>
              <div className="grid grid-cols-2 gap-4">
                {healthMetrics.map((metric, i) => (
                  <div key={i} className={`${metric.bgColor} p-6 rounded-2xl`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`${metric.iconBg} p-2 rounded-lg`}>
                        {metric.icon}
                      </div>
                      <TrendingUp size={18} className={metric.trendColor} />
                    </div>
                    <div className="text-3xl font-black text-gray-800 mb-1">{metric.value}</div>
                    <div className="text-sm text-gray-600">{metric.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Quick Info */}
          <div className="space-y-6">
            {/* Emergency Contact */}
            <div className="card bg-gradient-to-br from-red-500 to-pink-500 text-white">
              <AlertCircle className="mb-4" size={40} />
              <h3 className="text-2xl font-black mb-2">Emergency SOS</h3>
              <p className="mb-4 opacity-90">Quick access to emergency services</p>
              <Link href="/sos">
                <button className="w-full bg-white text-red-500 py-3 rounded-xl font-bold hover:shadow-xl transition-all">
                  Activate SOS
                </button>
              </Link>
            </div>

            {/* Medication Reminders */}
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Pill className="text-blue-500" size={24} />
                </div>
                <h3 className="text-xl font-black text-gray-800">Today's Medications</h3>
              </div>
              <div className="space-y-3">
                {medications.map((med, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                    <div>
                      <div className="font-bold text-gray-800">{med.name}</div>
                      <div className="text-sm text-gray-600">{med.dosage}</div>
                    </div>
                    <div className="text-sm font-semibold text-blue-600">{med.time}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="card bg-gradient-to-br from-purple-500 to-blue-500 text-white">
              <h3 className="text-xl font-black mb-4">This Week</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="opacity-90">Consultations</span>
                  <span className="text-2xl font-black">3</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="opacity-90">Health Checks</span>
                  <span className="text-2xl font-black">7</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="opacity-90">Messages</span>
                  <span className="text-2xl font-black">12</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const quickActions = [
  {
    icon: <AlertCircle size={40} />,
    title: 'Emergency SOS',
    description: 'Get immediate help',
    href: '/sos',
    gradient: 'bg-gradient-to-br from-red-500 to-pink-500',
  },
  {
    icon: <Video size={40} />,
    title: 'Video Call',
    description: 'Consult a doctor',
    href: '/video',
    gradient: 'bg-gradient-to-br from-blue-500 to-cyan-500',
  },
  {
    icon: <MessageCircle size={40} />,
    title: 'AI Assistant',
    description: 'Ask health questions',
    href: '/ai-assistant',
    gradient: 'bg-gradient-to-br from-purple-500 to-pink-500',
  },
  {
    icon: <Activity size={40} />,
    title: 'Health Tracking',
    description: 'Monitor your vitals',
    href: '/health',
    gradient: 'bg-gradient-to-br from-green-500 to-teal-500',
  },
];

const healthMetrics = [
  { icon: <Heart size={20} className="text-red-500" />, value: '72', label: 'Heart Rate (bpm)', bgColor: 'bg-red-50', iconBg: 'bg-red-100', trendColor: 'text-green-500' },
  { icon: <Activity size={20} className="text-blue-500" />, value: '120/80', label: 'Blood Pressure', bgColor: 'bg-blue-50', iconBg: 'bg-blue-100', trendColor: 'text-green-500' },
  { icon: <TrendingUp size={20} className="text-purple-500" />, value: '98.6°F', label: 'Temperature', bgColor: 'bg-purple-50', iconBg: 'bg-purple-100', trendColor: 'text-green-500' },
  { icon: <Activity size={20} className="text-green-500" />, value: '98%', label: 'Oxygen Level', bgColor: 'bg-green-50', iconBg: 'bg-green-100', trendColor: 'text-green-500' },
];

const medications = [
  { name: 'Prenatal Vitamins', dosage: '1 tablet', time: '9:00 AM' },
  { name: 'Folic Acid', dosage: '400 mcg', time: '2:00 PM' },
  { name: 'Iron Supplement', dosage: '65 mg', time: '8:00 PM' },
];
