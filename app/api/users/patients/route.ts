import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// GET /api/users/patients - Get patients for doctor
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  if (user.role !== 'DOCTOR') {
    return forbiddenResponse();
  }

  try {
    // Get unique patients who have appointments with this doctor
    const appointments = await prisma.appointment.findMany({
      where: { doctorId: user.id },
      select: { patientId: true },
      distinct: ['patientId'],
    });

    const patientIds = appointments.map((a) => a.patientId);

    const patients = await prisma.user.findMany({
      where: { id: { in: patientIds } },
      include: { patientProfile: true },
    });

    return Response.json({
      patients: patients.map((p) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        phone: p.phone,
        pregnancyWeek: p.patientProfile?.pregnancyWeek,
        dueDate: p.patientProfile?.dueDate,
      })),
    });
  } catch (error) {
    console.error('Fetch patients error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
