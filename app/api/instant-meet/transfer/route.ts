import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// POST /api/instant-meet/transfer
// Admin assigns a registered doctor to an instant meet.
// If an appointment already exists (appointmentId), updates its doctorId.
// If not, creates a new appointment for patient + doctor using the roomId.
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'ADMIN') return unauthorizedResponse();

  try {
    const { doctorId, patientId, roomId, appointmentId } = await request.json();

    if (!doctorId || !patientId || !roomId) {
      return Response.json(
        { message: 'doctorId, patientId and roomId are required' },
        { status: 400 }
      );
    }

    const [doctor, patient] = await Promise.all([
      prisma.user.findUnique({ where: { id: doctorId } }),
      prisma.user.findUnique({ where: { id: patientId } }),
    ]);

    if (!doctor || doctor.role !== 'DOCTOR') {
      return Response.json({ message: 'Invalid doctor' }, { status: 400 });
    }
    if (!patient) {
      return Response.json({ message: 'Patient not found' }, { status: 404 });
    }

    let appointment;

    if (appointmentId) {
      // Update existing appointment with the assigned doctor
      appointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { doctorId, status: 'SCHEDULED' },
      });
    } else {
      // Create a new appointment using the instant meet roomId
      appointment = await prisma.appointment.create({
        data: {
          patientId,
          doctorId,
          scheduledAt: new Date(),
          type: 'VIDEO',
          status: 'SCHEDULED',
          reason: 'Instant consultation (transferred by admin)',
          roomId,
        },
      });
    }

    const roomLink = `https://meet.jit.si/${roomId}`;

    // Notify doctor
    await prisma.notification.create({
      data: {
        userId: doctorId,
        type: 'INSTANT_MEET',
        title: 'Instant Consultation Assigned',
        body: `${patient.firstName} ${patient.lastName} needs an immediate consultation. Please join now.`,
        data: {
          appointmentId: appointment.id,
          roomLink,
          roomId,
          patientId,
          patientName: `${patient.firstName} ${patient.lastName}`,
        },
      },
    });

    // Notify patient
    await prisma.notification.create({
      data: {
        userId: patientId,
        type: 'INSTANT_MEET',
        title: 'Doctor Assigned',
        body: `Dr. ${doctor.firstName} ${doctor.lastName} has been assigned to your instant consultation. Please join the video call.`,
        data: {
          appointmentId: appointment.id,
          roomLink,
          roomId,
          doctorId,
          doctorName: `${doctor.firstName} ${doctor.lastName}`,
        },
      },
    });

    return Response.json({
      appointmentId: appointment.id,
      roomLink,
      doctorName: `${doctor.firstName} ${doctor.lastName}`,
    });
  } catch (error) {
    console.error('Transfer instant meet error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
