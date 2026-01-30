'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Mail, Lock, User, Phone, Loader } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',  // ✅ Added back
    email: '',
    phone: '',
    password: '',
    role: 'PATIENT' as 'PATIENT' | 'DOCTOR',
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate Indian phone number
    if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      toast.error('Enter valid 10-digit Indian mobile number');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        toast.success('Account created!');
        
        if (data.user.role === 'DOCTOR') {
          router.push('/dashboard/doctor');
        } else {
          router.push('/dashboard/mother');
        }
      } else {
        toast.error(data.message || 'Registration failed');
      }
    } catch (error) {
      toast.error('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-2.5 rounded-full">
              <Heart className="w-5 h-5 text-white" />
            </div>
          </div>

          <h1 className="text-center mb-1 text-lg">Create Account</h1>
          <p className="text-center text-gray-600 text-xs mb-4">Start your pregnancy care journey</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* First & Last Name - Side by Side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="input-field pl-8 text-xs"
                    placeholder="First"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="input-field pl-8 text-xs"
                    placeholder="Last"
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field pl-8 text-xs"
                  placeholder="your.email@example.com"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mobile</label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field pl-8 text-xs"
                  placeholder="98XXXXXXXX"
                  maxLength={10}
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">10-digit Indian mobile</p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-field pl-8 text-xs"
                  placeholder="Min 8 characters"
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">I am a</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'PATIENT' })}
                  className={`p-2.5 rounded-lg border-2 text-xs font-medium transition-all ${
                    formData.role === 'PATIENT'
                      ? 'border-pink-500 bg-pink-50 text-pink-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Expecting Mother
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'DOCTOR' })}
                  className={`p-2.5 rounded-lg border-2 text-xs font-medium transition-all ${
                    formData.role === 'DOCTOR'
                      ? 'border-pink-500 bg-pink-50 text-pink-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Healthcare Provider
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center text-xs"
            >
              {isLoading ? <Loader className="animate-spin h-4 w-4" /> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-600 mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-pink-600 font-medium hover:text-pink-700">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
