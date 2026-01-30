import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// GET /api/emergency-contacts - List emergency contacts
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const contacts = await prisma.emergencyContact.findMany({
      where: { patientId: user.id },
      orderBy: { priority: 'asc' },
    });

    return Response.json({ contacts });
  } catch (error) {
    console.error('Fetch emergency contacts error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/emergency-contacts - Add emergency contact
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { name, phone, relationship, email, priority = 1 } = body;

    if (!name || !phone || !relationship) {
      return Response.json(
        { message: 'Name, phone, and relationship are required' },
        { status: 400 }
      );
    }

    const contact = await prisma.emergencyContact.create({
      data: {
        patientId: user.id,
        name,
        phone,
        relationship,
        email,
        priority,
      },
    });

    return Response.json({ contact });
  } catch (error) {
    console.error('Create emergency contact error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/emergency-contacts - Delete emergency contact
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ message: 'Contact ID required' }, { status: 400 });
    }

    await prisma.emergencyContact.delete({
      where: { id, patientId: user.id },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Delete emergency contact error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
