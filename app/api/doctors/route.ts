import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// GET /api/doctors - List all registered doctors (admin use)
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'ADMIN') return unauthorizedResponse();

  try {
    const doctors = await prisma.user.findMany({
      where: { role: 'DOCTOR', isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        doctorProfile: { select: { specialization: true } },
      },
      orderBy: { firstName: 'asc' },
    });

    return Response.json({
      doctors: doctors.map((d) => ({
        id: d.id,
        name: `${d.firstName} ${d.lastName}`,
        phone: d.phone,
        email: d.email,
        specialization: d.doctorProfile?.specialization || 'General',
      })),
    });
  } catch (error) {
    console.error('Fetch doctors error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
