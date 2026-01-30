import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// GET /api/users/patients/[id] - Get patient details (for doctor)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  if (user.role !== 'DOCTOR') {
    return forbiddenResponse();
  }

  const { id: patientId } = await params;

  try {
    // Verify doctor has appointments with this patient
    const hasAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId: user.id,
        patientId: patientId,
      },
    });

    if (!hasAppointment) {
      return Response.json({ message: 'Patient not found' }, { status: 404 });
    }

    const patient = await prisma.user.findUnique({
      where: { id: patientId },
      include: {
        patientProfile: true,
      },
    });

    if (!patient) {
      return Response.json({ message: 'Patient not found' }, { status: 404 });
    }

    // Get patient's appointments with this doctor
    const appointments = await prisma.appointment.findMany({
      where: {
        patientId,
        doctorId: user.id,
      },
      include: {
        prescription: true,
        report: true,
      },
      orderBy: { scheduledAt: 'desc' },
      take: 10,
    });

    // Get patient's scans
    const scans = await prisma.medicalScan.findMany({
      where: { patientId },
      orderBy: { scanDate: 'desc' },
      take: 10,
    });

    return Response.json({
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.patientProfile?.dateOfBirth,
        bloodGroup: patient.patientProfile?.bloodGroup,
        pregnancyWeek: patient.patientProfile?.pregnancyWeek,
        dueDate: patient.patientProfile?.dueDate,
        allergies: patient.patientProfile?.allergies,
        medicalHistory: patient.patientProfile?.medicalHistory,
      },
      appointments: appointments.map((apt) => ({
        id: apt.id,
        date: apt.scheduledAt.toISOString().split('T')[0],
        time: apt.scheduledAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        status: apt.status,
        type: apt.type,
        reason: apt.reason,
        hasPrescription: !!apt.prescription,
        hasReport: !!apt.report,
      })),
      scans,
    });
  } catch (error) {
    console.error('Get patient error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
