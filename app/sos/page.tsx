'use client';

import { useState, useEffect, useRef } from 'react';
import {
  AlertCircle, Phone, MapPin, ArrowLeft,
  MessageCircle, Video, Users, Plus, Trash2, PhoneCall, X
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

interface OrgContact {
  id: string;
  orgId: string;
  orgName: string;
  name: string;
  phone: string;
  type: 'ORGANIZATION' | 'DOCTOR';
  specialization?: string;
}

export default function SOSPage() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>('');
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [primaryDoctor, setPrimaryDoctor] = useState<{ name: string; phone: string } | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relationship: '' });

  // Organization contacts for escalation
  const [orgContacts, setOrgContacts] = useState<OrgContact[]>([]);
  const [showEscalation, setShowEscalation] = useState(false);

  // Countdown state
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [showEmergencyActions, setShowEmergencyActions] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const emergencyTriggeredRef = useRef(false);

  useEffect(() => {
    fetchEmergencyContacts();
    fetchPrimaryDoctor();
    fetchOrganizations();
    getLocation();

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(coords);
          // Try to get address from coordinates
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json`
            );
            const data = await response.json();
            setAddress(data.display_name || '');
          } catch {
            setAddress(`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
          }
        },
        () => {
          // Default to Bangalore if location fails
          setLocation({ lat: 12.9716, lng: 77.5946 });
          setAddress('Location unavailable');
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const fetchEmergencyContacts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/emergency-contacts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    }
  };

  const fetchPrimaryDoctor = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.patientProfile?.primaryDoctor) {
        const doc = data.patientProfile.primaryDoctor;
        setPrimaryDoctor({
          name: `Dr. ${doc.user?.firstName} ${doc.user?.lastName}`,
          phone: doc.user?.phone || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch doctor:', error);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/organizations/oncall');
      const data = await response.json();
      setOrgContacts(data.emergencyContacts || []);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    }
  };

  const addContact = async () => {
    if (!newContact.name || !newContact.phone || !newContact.relationship) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/emergency-contacts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newContact),
      });

      if (response.ok) {
        const data = await response.json();
        setContacts([...contacts, data.contact]);
        setNewContact({ name: '', phone: '', relationship: '' });
        setShowAddContact(false);
        toast.success('Contact added');
      }
    } catch (error) {
      toast.error('Failed to add contact');
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/emergency-contacts?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setContacts(contacts.filter((c) => c.id !== id));
      toast.success('Contact removed');
    } catch (error) {
      toast.error('Failed to remove contact');
    }
  };

  // Generate Google Maps link
  const getGoogleMapsLink = () => {
    if (!location) return '';
    return `https://www.google.com/maps?q=${location.lat},${location.lng}`;
  };

  // Generate emergency message
  const getEmergencyMessage = () => {
    const mapsLink = getGoogleMapsLink();
    return `🚨 EMERGENCY SOS 🚨\n\nI need immediate help!\n\n📍 My Location:\n${address}\n\n🗺️ Google Maps:\n${mapsLink}\n\nPlease come quickly or call emergency services!`;
  };

  // Format phone number for WhatsApp
  const formatPhone = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  };

  // WhatsApp text with location - uses direct navigation for mobile compatibility
  const sendWhatsAppMessage = (phone: string) => {
    const message = encodeURIComponent(getEmergencyMessage());
    const phoneWithCountry = formatPhone(phone);
    // Use direct navigation instead of window.open for better mobile support
    window.location.href = `https://wa.me/${phoneWithCountry}?text=${message}`;
  };

  // WhatsApp video call request
  const startWhatsAppVideoCall = (phone: string) => {
    const phoneWithCountry = formatPhone(phone);
    const message = encodeURIComponent(`🚨 EMERGENCY! 🚨\n\nPlease VIDEO CALL me immediately!\n\n📍 My Location:\n${address}\n\n🗺️ ${getGoogleMapsLink()}`);
    window.location.href = `https://wa.me/${phoneWithCountry}?text=${message}`;
  };

  // Direct phone call
  const makePhoneCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  // Start SOS countdown
  const startSOSCountdown = () => {
    if (!location) {
      toast.error('Getting location... Please wait');
      return;
    }

    if (countdown !== null) return; // Already counting down

    emergencyTriggeredRef.current = false;
    setCountdown(10);
    setIsEmergencyActive(true);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          // Countdown finished - trigger emergency
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          if (!emergencyTriggeredRef.current) {
            emergencyTriggeredRef.current = true;
            triggerEmergency();
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Cancel SOS countdown
  const cancelSOS = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(null);
    setIsEmergencyActive(false);
    toast.info('Emergency cancelled');
  };

  // Trigger the actual emergency - automatically sends WhatsApp with video call request
  const triggerEmergency = async () => {
    setCountdown(null);
    setIsEmergencyActive(false);
    setShowEmergencyActions(true);

    // Save SOS alert to backend (non-blocking)
    const token = localStorage.getItem('token');
    fetch('/api/sos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        latitude: location!.lat,
        longitude: location!.lng,
        address,
        symptoms: [],
        description: 'Emergency SOS',
      }),
    }).catch((error) => console.error('SOS save error:', error));

    // Get all contacts
    const allContacts = getAllContacts();

    if (allContacts.length > 0) {
      // Automatically send WhatsApp with video call request to first contact
      const firstContact = allContacts[0];
      const mapsLink = getGoogleMapsLink();
      const message = encodeURIComponent(
        `🚨 EMERGENCY SOS 🚨\n\n` +
        `I need immediate help!\n\n` +
        `📹 PLEASE VIDEO CALL ME NOW!\n\n` +
        `📍 My Location:\n${address}\n\n` +
        `🗺️ Google Maps:\n${mapsLink}\n\n` +
        `Please come quickly or call emergency services!`
      );
      const phoneWithCountry = formatPhone(firstContact.phone);

      toast.success(`🚨 Sending emergency to ${firstContact.name}...`);

      // Small delay to show toast, then redirect to WhatsApp
      setTimeout(() => {
        window.location.href = `https://wa.me/${phoneWithCountry}?text=${message}`;
      }, 500);
    } else {
      // No contacts - call ambulance directly
      toast.error('No contacts saved! Calling Ambulance...');
      setTimeout(() => {
        window.location.href = 'tel:102';
      }, 500);
    }
  };

  // Get all emergency contacts including doctor
  const getAllContacts = () => {
    const allContacts = [...contacts];
    if (primaryDoctor) {
      allContacts.push({ id: 'doctor', name: primaryDoctor.name, phone: primaryDoctor.phone, relationship: 'Doctor' });
    }
    return allContacts;
  };

  // Reset emergency state
  const resetEmergency = () => {
    setShowEmergencyActions(false);
  };

  return (
    <div className="min-h-screen bg-red-50">
      {/* Header */}
      <div className="bg-white border-b border-red-200">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center space-x-3">
            <Link href="/dashboard/mother">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-red-600 font-bold text-lg">Emergency SOS</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* SOS Button with Countdown */}
        <div className="text-center">
          {showEmergencyActions ? (
            // Emergency activated - show quick action buttons
            <div className="space-y-4">
              <div className="bg-red-600 text-white p-4 rounded-xl">
                <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                <h2 className="text-xl font-bold">🚨 EMERGENCY ACTIVE</h2>
                <p className="text-red-100 text-sm mt-1">Tap an action below</p>
              </div>

              {/* Call Emergency Services */}
              <div className="grid grid-cols-2 gap-3">
                <a
                  href="tel:102"
                  className="flex flex-col items-center justify-center p-4 bg-red-600 text-white rounded-xl font-bold text-lg"
                >
                  <PhoneCall className="w-8 h-8 mb-2" />
                  <span>Call 102</span>
                  <span className="text-xs font-normal opacity-80">Ambulance</span>
                </a>
                <a
                  href="tel:108"
                  className="flex flex-col items-center justify-center p-4 bg-red-600 text-white rounded-xl font-bold text-lg"
                >
                  <PhoneCall className="w-8 h-8 mb-2" />
                  <span>Call 108</span>
                  <span className="text-xs font-normal opacity-80">Emergency</span>
                </a>
              </div>

              {/* Call Contacts */}
              {getAllContacts().length > 0 && (
                <div className="space-y-2">
                  <p className="text-gray-600 text-sm font-medium">Call Emergency Contact</p>
                  {getAllContacts().map((contact) => (
                    <a
                      key={contact.id}
                      href={`tel:${contact.phone}`}
                      className="flex items-center justify-between p-3 bg-green-600 text-white rounded-xl"
                    >
                      <div className="flex items-center space-x-3">
                        <Phone className="w-5 h-5" />
                        <div className="text-left">
                          <p className="font-semibold">{contact.name}</p>
                          <p className="text-xs opacity-80">{contact.relationship}</p>
                        </div>
                      </div>
                      <span className="text-sm">TAP TO CALL</span>
                    </a>
                  ))}
                </div>
              )}

              {/* WhatsApp Location */}
              {getAllContacts().length > 0 && (
                <div className="space-y-2">
                  <p className="text-gray-600 text-sm font-medium">Send Location via WhatsApp</p>
                  {getAllContacts().map((contact) => (
                    <button
                      key={`wa-${contact.id}`}
                      onClick={() => sendWhatsAppMessage(contact.phone)}
                      className="w-full flex items-center justify-between p-3 bg-green-500 text-white rounded-xl"
                    >
                      <div className="flex items-center space-x-3">
                        <MessageCircle className="w-5 h-5" />
                        <div className="text-left">
                          <p className="font-semibold">{contact.name}</p>
                          <p className="text-xs opacity-80">Send location + emergency message</p>
                        </div>
                      </div>
                      <span className="text-sm">SEND</span>
                    </button>
                  ))}
                </div>
              )}

              {/* WhatsApp Video Call */}
              {getAllContacts().length > 0 && (
                <div className="space-y-2">
                  <p className="text-gray-600 text-sm font-medium">Request Video Call</p>
                  {getAllContacts().slice(0, 2).map((contact) => (
                    <button
                      key={`video-${contact.id}`}
                      onClick={() => startWhatsAppVideoCall(contact.phone)}
                      className="w-full flex items-center justify-between p-3 bg-blue-600 text-white rounded-xl"
                    >
                      <div className="flex items-center space-x-3">
                        <Video className="w-5 h-5" />
                        <div className="text-left">
                          <p className="font-semibold">{contact.name}</p>
                          <p className="text-xs opacity-80">Opens WhatsApp for video call</p>
                        </div>
                      </div>
                      <span className="text-sm">VIDEO</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Escalation to Organizations */}
              {orgContacts.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowEscalation(!showEscalation)}
                    className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold flex items-center justify-center space-x-2"
                  >
                    <AlertCircle className="w-5 h-5" />
                    <span>Doctor not responding? Escalate to Hospitals</span>
                  </button>

                  {showEscalation && (
                    <div className="mt-3 space-y-2">
                      <p className="text-orange-600 text-sm font-medium">
                        Send emergency to partner hospitals ({orgContacts.length} contacts)
                      </p>
                      {orgContacts.map((contact) => (
                        <button
                          key={contact.id}
                          onClick={() => {
                            const mapsLink = getGoogleMapsLink();
                            const message = encodeURIComponent(
                              `🚨 EMERGENCY SOS - ESCALATION 🚨\n\n` +
                              `A patient needs immediate help!\n\n` +
                              `📹 PLEASE CALL/VIDEO CALL IMMEDIATELY!\n\n` +
                              `📍 Patient Location:\n${address}\n\n` +
                              `🗺️ Google Maps:\n${mapsLink}\n\n` +
                              `This is an escalated emergency from Health SOS app.`
                            );
                            const phoneWithCountry = formatPhone(contact.phone);
                            window.location.href = `https://wa.me/${phoneWithCountry}?text=${message}`;
                          }}
                          className="w-full flex items-center justify-between p-3 bg-orange-100 text-orange-800 rounded-xl hover:bg-orange-200"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="bg-orange-200 p-2 rounded-full">
                              {contact.type === 'ORGANIZATION' ? (
                                <AlertCircle className="w-4 h-4 text-orange-600" />
                              ) : (
                                <Users className="w-4 h-4 text-orange-600" />
                              )}
                            </div>
                            <div className="text-left">
                              <p className="font-semibold">{contact.name}</p>
                              <p className="text-xs opacity-80">
                                {contact.orgName} {contact.specialization && `• ${contact.specialization}`}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-medium">SEND</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Reset button */}
              <button
                onClick={resetEmergency}
                className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-medium mt-4"
              >
                I'm Safe - Cancel Emergency
              </button>
            </div>
          ) : countdown !== null ? (
            // Countdown active - show cancel option
            <div className="relative">
              <div className="w-44 h-44 mx-auto relative">
                {/* Animated ring */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="88"
                    cy="88"
                    r="80"
                    fill="none"
                    stroke="#fee2e2"
                    strokeWidth="8"
                  />
                  <circle
                    cx="88"
                    cy="88"
                    r="80"
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={502}
                    strokeDashoffset={502 - (502 * countdown) / 10}
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                {/* Countdown number */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold text-red-600">{countdown}</span>
                  <span className="text-red-500 text-sm mt-1">seconds</span>
                </div>
              </div>
              <p className="text-red-600 mt-4 font-semibold animate-pulse">
                🚨 Sending emergency in {countdown}s...
              </p>
              <button
                onClick={cancelSOS}
                className="mt-4 bg-gray-800 hover:bg-gray-900 text-white px-8 py-3 rounded-xl flex items-center justify-center space-x-2 mx-auto font-semibold"
              >
                <X className="w-5 h-5" />
                <span>CANCEL</span>
              </button>
            </div>
          ) : (
            // Normal SOS button
            <>
              <button
                onClick={startSOSCountdown}
                disabled={!location}
                className="w-40 h-40 bg-red-600 rounded-full shadow-2xl hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center justify-center mx-auto transition-transform animate-pulse hover:animate-none"
              >
                <AlertCircle className="w-16 h-16 text-white" />
              </button>
              <p className="text-red-600 mt-4 font-bold text-lg">TAP FOR EMERGENCY</p>
              <p className="text-gray-500 text-sm">10 seconds to cancel if pressed by mistake</p>
            </>
          )}
        </div>

        {/* Show rest of content only when NOT in emergency mode */}
        {!showEmergencyActions && (
          <>
            {/* Current Location */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Your Location</p>
                  <p className="text-gray-600 text-xs mt-1">{address || 'Getting location...'}</p>
                  {location && (
                    <a
                      href={getGoogleMapsLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 text-xs mt-1 inline-block"
                    >
                      View on Google Maps →
                    </a>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {!showEmergencyActions && (
          <>
        {/* Emergency Numbers */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center space-x-2 mb-3">
            <Phone className="w-4 h-4 text-red-600" />
            <h3 className="font-semibold text-sm">Emergency Services</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <a
              href="tel:102"
              className="flex items-center justify-center space-x-2 p-3 bg-red-100 rounded-lg text-red-700 font-medium"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Ambulance 102</span>
            </a>
            <a
              href="tel:108"
              className="flex items-center justify-center space-x-2 p-3 bg-red-100 rounded-lg text-red-700 font-medium"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Emergency 108</span>
            </a>
          </div>
        </div>

        {/* Primary Doctor */}
        {primaryDoctor && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">{primaryDoctor.name}</p>
                  <p className="text-gray-500 text-xs">Primary Doctor</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => makePhoneCall(primaryDoctor.phone)}
                  className="p-2 bg-green-100 rounded-full"
                  title="Call"
                >
                  <Phone className="w-4 h-4 text-green-600" />
                </button>
                <button
                  onClick={() => startWhatsAppVideoCall(primaryDoctor.phone)}
                  className="p-2 bg-green-100 rounded-full"
                  title="WhatsApp Video"
                >
                  <Video className="w-4 h-4 text-green-600" />
                </button>
                <button
                  onClick={() => sendWhatsAppMessage(primaryDoctor.phone)}
                  className="p-2 bg-green-100 rounded-full"
                  title="WhatsApp Message"
                >
                  <MessageCircle className="w-4 h-4 text-green-600" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Contacts */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-pink-600" />
              <h3 className="font-semibold text-sm">Emergency Contacts</h3>
            </div>
            <button
              onClick={() => setShowAddContact(true)}
              className="text-pink-600 text-sm flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>

          {contacts.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              No emergency contacts added yet
            </p>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{contact.name}</p>
                    <p className="text-gray-500 text-xs">{contact.relationship} • {contact.phone}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => makePhoneCall(contact.phone)}
                      className="p-2 bg-green-100 rounded-full"
                      title="Call"
                    >
                      <Phone className="w-3 h-3 text-green-600" />
                    </button>
                    <button
                      onClick={() => startWhatsAppVideoCall(contact.phone)}
                      className="p-2 bg-green-100 rounded-full"
                      title="WhatsApp Video"
                    >
                      <Video className="w-3 h-3 text-green-600" />
                    </button>
                    <button
                      onClick={() => sendWhatsAppMessage(contact.phone)}
                      className="p-2 bg-green-100 rounded-full"
                      title="WhatsApp Location"
                    >
                      <MessageCircle className="w-3 h-3 text-green-600" />
                    </button>
                    <button
                      onClick={() => deleteContact(contact.id)}
                      className="p-2 bg-red-100 rounded-full"
                      title="Remove"
                    >
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

          </>
        )}

        {/* Add Contact Modal */}
        {showAddContact && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="font-bold text-lg mb-4">Add Emergency Contact</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Name"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                />
                <select
                  value={newContact.relationship}
                  onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="">Select Relationship</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Sister">Sister</option>
                  <option value="Brother">Brother</option>
                  <option value="Friend">Friend</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex space-x-3 mt-4">
                <button
                  onClick={() => setShowAddContact(false)}
                  className="flex-1 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={addContact}
                  className="flex-1 py-2 bg-pink-600 text-white rounded-lg"
                >
                  Add Contact
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
