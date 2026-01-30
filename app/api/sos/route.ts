import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// POST /api/sos - Create SOS alert
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { latitude, longitude, address, symptoms = [], description } = body;

    if (!latitude || !longitude) {
      return Response.json(
        { message: 'Location coordinates are required' },
        { status: 400 }
      );
    }

    const sosAlert = await prisma.sOSAlert.create({
      data: {
        patientId: user.id,
        latitude,
        longitude,
        address,
        symptoms,
        description,
        urgencyLevel: 5,
        status: 'PENDING',
      },
    });

    return Response.json({
      alert: {
        id: sosAlert.id,
        status: sosAlert.status,
        createdAt: sosAlert.createdAt,
      },
      message: 'Emergency alert created',
    });
  } catch (error) {
    console.error('Create SOS error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/sos - Get user's SOS history
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const alerts = await prisma.sOSAlert.findMany({
      where: { patientId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return Response.json({ alerts });
  } catch (error) {
    console.error('Fetch SOS alerts error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
