import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// GET /api/user/profile - Get current user profile
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        patientProfile: {
          include: {
            primaryDoctor: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    phone: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        doctorProfile: true,
      },
    });

    if (!fullUser) {
      return Response.json({ message: 'User not found' }, { status: 404 });
    }

    return Response.json({
      id: fullUser.id,
      email: fullUser.email,
      phone: fullUser.phone,
      firstName: fullUser.firstName,
      lastName: fullUser.lastName,
      role: fullUser.role,
      avatar: fullUser.avatar,
      patientProfile: fullUser.patientProfile,
      doctorProfile: fullUser.doctorProfile,
    });
  } catch (error) {
    console.error('Fetch profile error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/user/profile - Update user profile
export async function PUT(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { firstName, lastName, phone, avatar } = body;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone && { phone }),
        ...(avatar && { avatar }),
      },
    });

    return Response.json({
      id: updatedUser.id,
      email: updatedUser.email,
      phone: updatedUser.phone,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      role: updatedUser.role,
      avatar: updatedUser.avatar,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
