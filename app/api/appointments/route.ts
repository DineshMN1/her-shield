import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// GET /api/appointments - List appointments
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = user.role === 'DOCTOR'
      ? { doctorId: user.id }
      : { patientId: user.id };

    if (status) {
      where.status = status;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { firstName: true, lastName: true } },
        doctor: {
          include: { doctorProfile: { select: { specialization: true } } },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return Response.json({
      appointments: appointments.map((apt) => {
        const hours = apt.scheduledAt.getHours().toString().padStart(2, '0');
        const minutes = apt.scheduledAt.getMinutes().toString().padStart(2, '0');
        return {
          id: apt.id,
          patientId: apt.patientId,
          patientName: `${apt.patient.firstName} ${apt.patient.lastName}`,
          doctorId: apt.doctorId,
          doctorName: `${apt.doctor.firstName} ${apt.doctor.lastName}`,
          specialty: apt.doctor.doctorProfile?.specialization,
          date: apt.scheduledAt.toISOString().split('T')[0],
          time: `${hours}:${minutes}`,
          scheduledAt: apt.scheduledAt.toISOString(),
          status: apt.status,
          type: apt.type,
          reason: apt.reason,
        };
      }),
    });
  } catch (error) {
    console.error('Fetch appointments error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/appointments - Create appointment
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { doctorId, date, time, type = 'CLINIC', reason } = body;

    if (!doctorId || !date || !time) {
      return Response.json(
        { message: 'Doctor, date, and time are required' },
        { status: 400 }
      );
    }

    const scheduledAt = new Date(`${date}T${time}`);

    // Check for conflicts
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId,
        scheduledAt,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
    });

    if (existingAppointment) {
      return Response.json(
        { message: 'This time slot is already booked' },
        { status: 409 }
      );
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: user.id,
        doctorId,
        scheduledAt,
        type,
        reason,
      },
      include: {
        doctor: { select: { firstName: true, lastName: true } },
      },
    });

    return Response.json({
      appointment: {
        id: appointment.id,
        doctorName: `${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
        date: appointment.scheduledAt.toISOString().split('T')[0],
        time: appointment.scheduledAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        status: appointment.status,
        type: appointment.type,
      },
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
