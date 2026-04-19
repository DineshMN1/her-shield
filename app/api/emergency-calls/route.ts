import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// POST /api/emergency-calls - Create emergency call (start tracking)
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { patientName, patientPhone, roomLink, primaryDoctorPhone } = body;

    if (!roomLink) {
      return Response.json({ message: 'Room link is required' }, { status: 400 });
    }

    const emergencyCall = await prisma.emergencyCall.create({
      data: {
        patientName: patientName || `${user.firstName} ${user.lastName}`,
        patientPhone: patientPhone || user.phone,
        roomLink,
        primaryDoctorPhone,
        status: 'WAITING',
      },
    });

    return Response.json({ emergencyCall });
  } catch (error) {
    console.error('Create emergency call error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/emergency-calls - Update emergency call status / escalate
export async function PUT(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { id, action, ...data } = body;

    if (!id) {
      return Response.json({ message: 'Call ID required' }, { status: 400 });
    }

    // Handle escalation
    if (action === 'ESCALATE') {
      // Get all active organizations with on-call doctors
      const organizations = await prisma.organization.findMany({
        where: { isActive: true },
        include: {
          doctors: { where: { isOnCall: true } },
        },
      });

      const orgIds = organizations.map((o) => o.id);

      const emergencyCall = await prisma.emergencyCall.update({
        where: { id },
        data: {
          status: 'ESCALATED',
          escalatedAt: new Date(),
          escalatedToOrgs: orgIds,
        },
      });

      // Return organizations with contact info for the client to send WhatsApp
      const escalationContacts = organizations.flatMap((org) => {
        const contacts = [];
        if (org.emergencyWhatsApp) {
          contacts.push({
            orgId: org.id,
            orgName: org.name,
            phone: org.emergencyWhatsApp,
            type: 'ORG_EMERGENCY',
          });
        }
        org.doctors.forEach((doc) => {
          contacts.push({
            orgId: org.id,
            orgName: org.name,
            phone: doc.doctorPhone,
            name: doc.doctorName,
            type: 'DOCTOR',
          });
        });
        return contacts;
      });

      return Response.json({ emergencyCall, escalationContacts });
    }

    // Handle doctor response
    if (action === 'DOCTOR_JOINED') {
      const emergencyCall = await prisma.emergencyCall.update({
        where: { id },
        data: {
          status: 'CONNECTED',
          respondedOrgId: data.orgId,
          respondedDoctorName: data.doctorName,
          respondedAt: new Date(),
        },
      });
      return Response.json({ emergencyCall });
    }

    // Handle completion
    if (action === 'COMPLETE') {
      const emergencyCall = await prisma.emergencyCall.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
      return Response.json({ emergencyCall });
    }

    // Generic update
    const emergencyCall = await prisma.emergencyCall.update({
      where: { id },
      data,
    });

    return Response.json({ emergencyCall });
  } catch (error) {
    console.error('Update emergency call error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/emergency-calls - Get emergency calls (for admin/org dashboard)
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (status) where.status = status;

    const calls = await prisma.emergencyCall.findMany({
      where,
      include: { respondedOrg: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return Response.json({ calls });
  } catch (error) {
    console.error('Fetch emergency calls error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
