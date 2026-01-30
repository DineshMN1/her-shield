import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// GET /api/appointments/doctor/today - Get doctor's today appointments
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  if (user.role !== 'DOCTOR') {
    return forbiddenResponse();
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId: user.id,
        scheduledAt: {
          gte: today,
          lt: tomorrow,
        },
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return Response.json({
      appointments: appointments.map((apt) => ({
        id: apt.id,
        patientName: `${apt.patient.firstName} ${apt.patient.lastName}`,
        time: apt.scheduledAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        status: apt.status,
        type: apt.type,
        reason: apt.reason,
      })),
    });
  } catch (error) {
    console.error('Fetch today appointments error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
