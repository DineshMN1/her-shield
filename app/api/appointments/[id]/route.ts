import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// GET /api/appointments/[id] - Get appointment details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        doctor: {
          include: { doctorProfile: { select: { specialization: true } } },
        },
        prescription: true,
        report: true,
        scans: true,
      },
    });

    if (!appointment) {
      return Response.json({ message: 'Appointment not found' }, { status: 404 });
    }

    // Check access
    if (appointment.patientId !== user.id && appointment.doctorId !== user.id) {
      return forbiddenResponse();
    }

    return Response.json({
      appointment: {
        id: appointment.id,
        patientId: appointment.patientId,
        patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
        doctorId: appointment.doctorId,
        doctorName: `${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
        specialty: appointment.doctor.doctorProfile?.specialization,
        date: appointment.scheduledAt.toISOString().split('T')[0],
        time: appointment.scheduledAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        status: appointment.status,
        type: appointment.type,
        reason: appointment.reason,
        prescription: appointment.prescription,
        report: appointment.report,
        scans: appointment.scans,
      },
    });
  } catch (error) {
    console.error('Get appointment error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/appointments/[id] - Update appointment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      return Response.json({ message: 'Appointment not found' }, { status: 404 });
    }

    if (appointment.patientId !== user.id && appointment.doctorId !== user.id) {
      return forbiddenResponse();
    }

    const body = await request.json();
    const { status, notes } = body;

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(notes && { notes }),
      },
    });

    return Response.json({ appointment: updated });
  } catch (error) {
    console.error('Update appointment error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/appointments/[id] - Cancel appointment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      return Response.json({ message: 'Appointment not found' }, { status: 404 });
    }

    if (appointment.patientId !== user.id && appointment.doctorId !== user.id) {
      return forbiddenResponse();
    }

    await prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return Response.json({ message: 'Appointment cancelled' });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
