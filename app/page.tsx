'use client';

import { motion } from 'framer-motion';
import { Heart, Video, MessageCircle, AlertCircle, Activity, CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-xl shadow-lg sticky top-0 z-50 border-b-2 border-pink-100">
        <div className="container mx-auto px-4 py-5 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-pink-500 to-purple-600 p-3 rounded-2xl shadow-lg">
              <Heart className="text-white" size={32} />
            </div>
            <span className="text-3xl font-black gradient-text">Health SOS</span>
          </Link>
          <div className="flex gap-4">
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 rounded-xl border-2 border-pink-500 text-pink-600 font-bold hover:bg-pink-50 transition-all shadow-md"
              >
                Login
              </motion.button>
            </Link>
            <Link href="/register">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all"
              >
                Get Started Free
              </motion.button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-20">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20 relative"
        >
          {/* Decorative floating hearts */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-pink-200 opacity-20"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [-20, 20],
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 6 + i,
                  repeat: Infinity,
                  repeatType: 'reverse',
                }}
              >
                <Heart size={40 + i * 10} />
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-block mb-8"
          >
            <div className="bg-gradient-to-br from-pink-400 via-purple-500 to-blue-500 p-8 rounded-full shadow-2xl animate-pulse">
              <Heart className="text-white" size={80} />
            </div>
          </motion.div>

          <h1 className="text-7xl md:text-8xl font-black mb-6 leading-tight">
            <span className="gradient-text">Health SOS</span>
          </h1>
          
          <p className="text-3xl md:text-4xl text-gray-700 mb-4 font-bold">
            Your 24/7 Pregnancy Care Companion
          </p>
          
          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Emergency support • Video consultations • AI health guidance • Health tracking - all in one beautiful platform
          </p>

          <div className="flex gap-6 justify-center flex-wrap">
            <Link href="/register">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-12 py-5 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white text-xl font-black rounded-2xl shadow-2xl hover:shadow-pink-500/50 transition-all"
              >
                Start Your Journey <ArrowRight className="inline ml-2" />
              </motion.button>
            </Link>
          </div>

          {/* Trust Badges */}
          <div className="flex gap-8 justify-center mt-12 flex-wrap">
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-500" size={24} />
              <span className="text-gray-700 font-semibold">HIPAA Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-500" size={24} />
              <span className="text-gray-700 font-semibold">256-bit Encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-500" size={24} />
              <span className="text-gray-700 font-semibold">24/7 Support</span>
            </div>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              whileHover={{ y: -10, scale: 1.02 }}
            >
              <Link href="/login">
                <div className="bg-gradient-to-br from-white via-pink-50 to-purple-50 p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all border-2 border-pink-100 hover:border-pink-300 h-full">
                  <div className={`${feature.color} p-5 rounded-2xl inline-block mb-6 shadow-lg`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-black mb-4 text-gray-800">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed mb-4">{feature.description}</p>
                  <div className="flex items-center text-pink-500 font-bold gap-2">
                    Learn More <ArrowRight size={18} />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Features Summary */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-24 bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-12 border-2 border-pink-100"
        >
          <h2 className="text-4xl font-black text-center mb-12 gradient-text">Why Choose Health SOS?</h2>
          <div className="grid md:grid-cols-4 gap-12 text-center">
            <div>
              <div className="text-5xl font-black mb-3 text-red-500">24/7</div>
              <div className="text-gray-600 text-lg font-semibold">Emergency Support</div>
            </div>
            <div>
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                <Video className="w-8 h-8 text-purple-500" />
              </div>
              <div className="text-gray-600 text-lg font-semibold">HD Video Calls</div>
            </div>
            <div>
              <div className="bg-pink-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="w-8 h-8 text-pink-500" />
              </div>
              <div className="text-gray-600 text-lg font-semibold">AI Health Guide</div>
            </div>
            <div>
              <div className="text-5xl font-black mb-3 text-green-500">100%</div>
              <div className="text-gray-600 text-lg font-semibold">Secure & Private</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

const features = [
  {
    icon: <AlertCircle size={48} className="text-red-500" />,
    title: 'Emergency SOS',
    description: 'One-tap emergency alerts to doctors and family with GPS location sharing',
    color: 'bg-red-100',
  },
  {
    icon: <Video size={48} className="text-blue-500" />,
    title: 'Video Consultations',
    description: 'Connect with verified OB-GYN specialists instantly through secure HD video',
    color: 'bg-blue-100',
  },
  {
    icon: <MessageCircle size={48} className="text-purple-500" />,
    title: 'AI Health Assistant',
    description: '24/7 intelligent chatbot trained on pregnancy care for instant guidance',
    color: 'bg-purple-100',
  },
  {
    icon: <Activity size={48} className="text-green-500" />,
    title: 'Health Tracking',
    description: 'Monitor vitals, medications, appointments and pregnancy milestones',
    color: 'bg-green-100',
  },
];

