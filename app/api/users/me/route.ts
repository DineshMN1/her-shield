import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// GET /api/users/me - Get current user
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        patientProfile: true,
        doctorProfile: true,
      },
    });

    if (!fullUser) {
      return Response.json({ message: 'User not found' }, { status: 404 });
    }

    return Response.json({
      user: {
        id: fullUser.id,
        email: fullUser.email,
        firstName: fullUser.firstName,
        lastName: fullUser.lastName,
        role: fullUser.role,
        phone: fullUser.phone,
        profile: fullUser.role === 'DOCTOR' ? fullUser.doctorProfile : fullUser.patientProfile,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
