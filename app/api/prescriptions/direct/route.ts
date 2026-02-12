import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// POST /api/prescriptions/direct - Prescribe to any patient without appointment
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  if (user.role !== 'DOCTOR') {
    return forbiddenResponse();
  }

  try {
    const body = await request.json();
    const { patientId, diagnosis, medicines, advice, followUpDate } = body;

    if (!patientId || !diagnosis || !medicines?.length) {
      return Response.json(
        { message: 'Patient, diagnosis, and medicines are required' },
        { status: 400 }
      );
    }

    // Verify patient exists
    const patient = await prisma.user.findUnique({
      where: { id: patientId, role: 'PATIENT' },
    });

    if (!patient) {
      return Response.json({ message: 'Patient not found' }, { status: 404 });
    }

    // Create a quick appointment for record-keeping
    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId: user.id,
        scheduledAt: new Date(),
        type: 'CLINIC',
        status: 'COMPLETED',
        reason: `Direct prescription: ${diagnosis}`,
      },
    });

    // Create the prescription
    const prescription = await prisma.prescription.create({
      data: {
        appointmentId: appointment.id,
        diagnosis,
        medicines,
        advice,
        followUpDate: followUpDate ? new Date(followUpDate) : undefined,
      },
    });

    // Notify patient
    await prisma.notification.create({
      data: {
        userId: patientId,
        type: 'PRESCRIPTION',
        title: 'New Prescription',
        body: `Dr. ${user.firstName} ${user.lastName} has prescribed medicines for: ${diagnosis}`,
        data: { prescriptionId: prescription.id, appointmentId: appointment.id },
      },
    });

    return Response.json({
      prescription: {
        id: prescription.id,
        appointmentId: appointment.id,
        diagnosis,
        medicines,
      },
    });
  } catch (error) {
    console.error('Direct prescription error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
