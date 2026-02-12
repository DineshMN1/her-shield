import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// GET /api/appointments/doctor/all - Get all doctor appointments
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  if (user.role !== 'DOCTOR') {
    return forbiddenResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = { doctorId: user.id };
    if (status) {
      where.status = status;
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          patient: {
            select: { firstName: true, lastName: true, phone: true },
          },
          prescription: { select: { id: true } },
        },
        orderBy: { scheduledAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.appointment.count({ where }),
    ]);

    return Response.json({
      appointments: appointments.map((apt) => ({
        id: apt.id,
        patientId: apt.patientId,
        patientName: `${apt.patient.firstName} ${apt.patient.lastName}`,
        patientPhone: apt.patient.phone,
        date: apt.scheduledAt.toISOString().split('T')[0],
        time: apt.scheduledAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        scheduledAt: apt.scheduledAt.toISOString(),
        status: apt.status,
        type: apt.type,
        reason: apt.reason,
        hasPrescription: !!apt.prescription,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Fetch all appointments error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
