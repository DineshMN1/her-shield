import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// GET /api/medical-records/prescriptions/my - Get patient's prescriptions
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const prescriptions = await prisma.prescription.findMany({
      where: {
        appointment: { patientId: user.id },
      },
      include: {
        appointment: {
          include: {
            doctor: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Response.json({ prescriptions });
  } catch (error) {
    console.error('Fetch prescriptions error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
