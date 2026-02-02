import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/organizations/oncall - Get all on-call doctors from organizations
// This is used for emergency escalation when primary doctor doesn't respond
export async function GET(request: NextRequest) {
  try {
    const organizations = await prisma.organization.findMany({
      where: { isActive: true },
      include: {
        doctors: {
          where: { isOnCall: true },
        },
      },
    });

    // Format response with all emergency contacts
    const emergencyContacts = organizations.flatMap((org) => {
      const contacts = [];

      // Add organization emergency contact
      if (org.emergencyWhatsApp || org.emergencyPhone) {
        contacts.push({
          id: `org-${org.id}`,
          orgId: org.id,
          orgName: org.name,
          name: `${org.name} Emergency`,
          phone: org.emergencyWhatsApp || org.emergencyPhone || '',
          type: 'ORGANIZATION',
        });
      }

      // Add individual on-call doctors
      org.doctors.forEach((doc) => {
        contacts.push({
          id: doc.id,
          orgId: org.id,
          orgName: org.name,
          name: doc.doctorName,
          phone: doc.doctorPhone,
          specialization: doc.specialization,
          type: 'DOCTOR',
        });
      });

      return contacts;
    });

    return Response.json({
      organizations: organizations.map((o) => ({
        id: o.id,
        name: o.name,
        emergencyPhone: o.emergencyPhone,
        emergencyWhatsApp: o.emergencyWhatsApp,
        doctorCount: o.doctors.length,
      })),
      emergencyContacts,
    });
  } catch (error) {
    console.error('Fetch on-call organizations error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
