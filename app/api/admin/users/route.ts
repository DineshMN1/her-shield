import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// GET /api/admin/users - Get all users for admin
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  if (user.role !== 'ADMIN') {
    return forbiddenResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    const ALLOWED_ROLES = ['PATIENT', 'DOCTOR', 'ADMIN', 'FAMILY'];
    const where: Record<string, unknown> = {};
    if (role) {
      if (!ALLOWED_ROLES.includes(role)) {
        return Response.json({ message: 'Invalid role filter' }, { status: 400 });
      }
      where.role = role;
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        patientProfile: {
          select: {
            pregnancyWeek: true,
            dueDate: true,
            bloodGroup: true,
            city: true,
          },
        },
        doctorProfile: {
          select: {
            specialization: true,
            hospitalAffiliation: true,
            isAvailable: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return Response.json({
      users: users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
        dueDate: u.patientProfile?.dueDate?.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Fetch users error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
