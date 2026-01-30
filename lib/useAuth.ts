'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  phone: string;
}

export function useAuth(requiredRole?: 'PATIENT' | 'DOCTOR' | 'ADMIN') {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData) as User;

      // Check role if required
      if (requiredRole && parsedUser.role !== requiredRole) {
        // Redirect to appropriate dashboard
        if (parsedUser.role === 'DOCTOR') {
          router.push('/dashboard/doctor');
        } else {
          router.push('/dashboard/mother');
        }
        return;
      }

      setUser(parsedUser);
    } catch {
      localStorage.clear();
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [requiredRole, router]);

  const logout = () => {
    localStorage.clear();
    router.push('/login');
  };

  return { user, loading, logout };
}

export function useRequireAuth() {
  return useAuth();
}

export function useRequireDoctor() {
  return useAuth('DOCTOR');
}

export function useRequirePatient() {
  return useAuth('PATIENT');
}
