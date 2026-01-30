import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// POST /api/medical-records/reports - Create consultation report
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  if (user.role !== 'DOCTOR') {
    return forbiddenResponse();
  }

  try {
    const body = await request.json();
    const { appointmentId, chiefComplaint, examination, diagnosis, treatmentPlan, vitals, recommendations } = body;

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

    const report = await prisma.consultationReport.create({
      data: {
        appointmentId,
        chiefComplaint,
        examination,
        diagnosis,
        treatmentPlan,
        vitals,
        recommendations: recommendations || [],
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

    return Response.json({ report });
  } catch (error) {
    console.error('Create report error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
