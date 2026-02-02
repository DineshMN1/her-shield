import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// GET /api/admin/organizations - List all organizations
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'ADMIN') return unauthorizedResponse();

  try {
    const organizations = await prisma.organization.findMany({
      include: {
        doctors: true,
        _count: { select: { doctors: true, emergencyCalls: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Response.json({ organizations });
  } catch (error) {
    console.error('Fetch organizations error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/organizations - Create/Invite organization
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'ADMIN') return unauthorizedResponse();

  try {
    const body = await request.json();
    const {
      name,
      type = 'HOSPITAL',
      address,
      city,
      state,
      phone,
      email,
      website,
      emergencyPhone,
      emergencyWhatsApp,
      plan = 'FREE',
    } = body;

    if (!name || !phone) {
      return Response.json(
        { message: 'Name and phone are required' },
        { status: 400 }
      );
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        type,
        address,
        city,
        state,
        phone,
        email,
        website,
        emergencyPhone,
        emergencyWhatsApp,
        plan,
      },
    });

    return Response.json({ organization, message: 'Organization invited successfully' });
  } catch (error) {
    console.error('Create organization error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/organizations - Update organization
export async function PUT(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'ADMIN') return unauthorizedResponse();

  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return Response.json({ message: 'Organization ID required' }, { status: 400 });
    }

    const organization = await prisma.organization.update({
      where: { id },
      data,
    });

    return Response.json({ organization });
  } catch (error) {
    console.error('Update organization error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/organizations - Delete organization
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'ADMIN') return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ message: 'Organization ID required' }, { status: 400 });
    }

    await prisma.organization.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Delete organization error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
