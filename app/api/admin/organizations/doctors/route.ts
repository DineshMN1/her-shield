import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// POST /api/admin/organizations/doctors - Add doctor to organization
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'ADMIN') return unauthorizedResponse();

  try {
    const body = await request.json();
    const { organizationId, doctorName, doctorPhone, doctorEmail, specialization, isOnCall } = body;

    if (!organizationId || !doctorName || !doctorPhone) {
      return Response.json(
        { message: 'Organization ID, doctor name and phone are required' },
        { status: 400 }
      );
    }

    const doctor = await prisma.organizationDoctor.create({
      data: {
        organizationId,
        doctorName,
        doctorPhone,
        doctorEmail,
        specialization,
        isOnCall: isOnCall || false,
      },
    });

    return Response.json({ doctor });
  } catch (error) {
    console.error('Add doctor error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/organizations/doctors - Remove doctor from organization
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'ADMIN') return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ message: 'Doctor ID required' }, { status: 400 });
    }

    await prisma.organizationDoctor.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Delete doctor error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
