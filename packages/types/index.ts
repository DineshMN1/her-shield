export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
}

export interface SOSAlert {
  id: string;
  patientId: string;
  latitude: number;
  longitude: number;
  symptoms: string[];
  urgencyLevel: number;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED';
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  scheduledAt: Date;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}
