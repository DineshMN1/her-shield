import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// POST /api/instant-meet - Create instant meeting room & notify doctors
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { reason } = body;

    const roomId = `instant-${user.id}-${Date.now()}`;
    const roomLink = `https://meet.jit.si/${roomId}`;

    // Get patient's primary doctor
    const patient = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        patientProfile: {
          include: {
            primaryDoctor: {
              include: { user: true },
            },
          },
        },
      },
    });

    const notifiedDoctors: string[] = [];

    // Notify primary doctor if exists
    if (patient?.patientProfile?.primaryDoctor) {
      const doc = patient.patientProfile.primaryDoctor.user;
      notifiedDoctors.push(`${doc.firstName} ${doc.lastName}`);

      await prisma.notification.create({
        data: {
          userId: doc.id,
          type: 'INSTANT_MEET',
          title: 'Instant Meeting Request',
          body: `${user.firstName} ${user.lastName} is requesting an immediate consultation. Reason: ${reason || 'Not specified'}`,
          data: { roomLink, roomId, patientId: user.id, patientName: `${user.firstName} ${user.lastName}` },
        },
      });
    }

    // Get on-call doctors from organizations
    const onCallDoctors = await prisma.organizationDoctor.findMany({
      where: { isOnCall: true },
      include: { organization: true },
    });

    // Create emergency call record
    await prisma.emergencyCall.create({
      data: {
        patientName: `${user.firstName} ${user.lastName}`,
        patientPhone: user.phone,
        roomLink,
        status: 'WAITING',
        primaryDoctorPhone: patient?.patientProfile?.primaryDoctor?.user?.phone,
      },
    });

    // Create an instant appointment
    let doctorId = patient?.patientProfile?.primaryDoctor?.userId;

    // If no primary doctor, try first on-call doctor from org
    if (!doctorId && onCallDoctors.length > 0) {
      // Find a registered doctor user by phone
      const orgDoc = onCallDoctors[0];
      const registeredDoc = await prisma.user.findFirst({
        where: { phone: orgDoc.doctorPhone, role: 'DOCTOR' },
      });
      if (registeredDoc) {
        doctorId = registeredDoc.id;
      }
    }

    // If we have a doctor, create an appointment
    let appointmentId = null;
    if (doctorId) {
      const appointment = await prisma.appointment.create({
        data: {
          patientId: user.id,
          doctorId,
          scheduledAt: new Date(),
          type: 'VIDEO',
          status: 'SCHEDULED',
          reason: reason || 'Instant consultation request',
          roomId,
        },
      });
      appointmentId = appointment.id;
    }

    return Response.json({
      roomId,
      roomLink,
      appointmentId,
      notifiedDoctors,
      onCallDoctors: onCallDoctors.map((d) => ({
        name: d.doctorName,
        phone: d.doctorPhone,
        org: d.organization.name,
        specialization: d.specialization,
      })),
    });
  } catch (error) {
    console.error('Instant meet error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
