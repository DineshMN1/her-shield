import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// POST /api/medical-records/prescriptions - Create prescription
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  if (user.role !== 'DOCTOR') {
    return forbiddenResponse();
  }

  try {
    const body = await request.json();
    const { appointmentId, diagnosis, medicines, advice, followUpDate } = body;

    // Verify appointment belongs to this doctor
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return Response.json({ message: 'Appointment not found' }, { status: 404 });
    }

    if (appointment.doctorId !== user.id) {
      return forbiddenResponse();
    }

    const prescription = await prisma.prescription.create({
      data: {
        appointmentId,
        diagnosis,
        medicines,
        advice,
        followUpDate: followUpDate ? new Date(followUpDate) : undefined,
      },
      include: {
        appointment: {
          include: {
            patient: { select: { firstName: true, lastName: true } },
            doctor: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    return Response.json({ prescription });
  } catch (error) {
    console.error('Create prescription error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
