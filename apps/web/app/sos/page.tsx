'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Phone, MapPin, ArrowLeft, Loader } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function SOSPage() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocation({ lat: 12.9716, lng: 77.5946 })
      );
    }
  }, []);

  const activateSOS = async () => {
    if (!location) {
      toast.error('Getting location...');
      return;
    }

    setIsActivating(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/sos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          latitude: location.lat,
          longitude: location.lng,
          symptoms: [],
          description: 'Emergency SOS',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Emergency alert sent!');
      } else {
        toast.error(data.message || 'Failed');
      }
    } catch (error) {
      toast.error('Error. Calling emergency...');
      window.location.href = 'tel:102';
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="min-h-screen bg-red-50">
      <div className="bg-white border-b border-red-200">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center space-x-3">
            <Link href="/dashboard/mother">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-red-600">Emergency SOS</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <button
            onClick={activateSOS}
            disabled={isActivating || !location}
            className="w-40 h-40 bg-red-600 rounded-full shadow-2xl hover:scale-105 disabled:opacity-50 flex items-center justify-center"
          >
            {isActivating ? (
              <Loader className="w-16 h-16 text-white animate-spin" />
            ) : (
              <AlertCircle className="w-16 h-16 text-white" />
            )}
          </button>
          <p className="text-red-600 mt-4 font-medium">Tap to Activate</p>
        </div>

        <div className="card">
          <div className="flex items-center space-x-2 mb-3">
            <Phone className="w-4 h-4 text-red-600" />
            <h3 className="font-medium text-sm">Emergency Numbers</h3>
          </div>
          <a href="tel:102" className="block p-2 bg-gray-50 rounded mb-2">
            Ambulance: 102
          </a>
          <a href="tel:108" className="block p-2 bg-gray-50 rounded">
            Emergency: 108
          </a>
        </div>

        {location && (
          <div className="card mt-3">
            <MapPin className="w-4 h-4 text-green-600 inline mr-2" />
            <span className="text-xs">
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
