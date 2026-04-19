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

    const roomId = `instant-${user.id.replace(/-/g, '')}-${Date.now()}`;
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
    const doctorUserIds = new Set<string>();

    // Notify primary doctor if exists
    if (patient?.patientProfile?.primaryDoctor) {
      const doc = patient.patientProfile.primaryDoctor.user;
      notifiedDoctors.push(`${doc.firstName} ${doc.lastName}`);
      doctorUserIds.add(doc.id);
    }

    // Get on-call doctors from organizations
    const onCallDoctors = await prisma.organizationDoctor.findMany({
      where: { isOnCall: true },
      include: { organization: true },
    });

    // Add on-call doctors (mapped by phone to doctor users)
    const onCallDoctorUsers = await prisma.user.findMany({
      where: {
        role: 'DOCTOR',
        phone: { in: onCallDoctors.map((d) => d.doctorPhone) },
      },
      select: { id: true, firstName: true, lastName: true, phone: true },
    });
    for (const doc of onCallDoctorUsers) {
      doctorUserIds.add(doc.id);
    }

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

    const notificationBody = `${user.firstName} ${user.lastName} is requesting an immediate consultation. Reason: ${reason || 'Not specified'}`;

    // Notify doctors
    if (doctorUserIds.size > 0) {
      await prisma.notification.createMany({
        data: Array.from(doctorUserIds).map((doctorId) => ({
          userId: doctorId,
          type: 'INSTANT_MEET',
          title: 'Instant Meeting Request',
          body: notificationBody,
          data: {
            roomLink,
            roomId,
            patientId: user.id,
            patientName: `${user.firstName} ${user.lastName}`,
          },
        })),
      });
    }

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: 'INSTANT_MEET',
          title: 'Instant Meet Triggered',
          body: `${user.firstName} ${user.lastName} started an instant meet request. Reason: ${reason || 'Not specified'}`,
          data: {
            roomLink,
            roomId,
            patientId: user.id,
            patientName: `${user.firstName} ${user.lastName}`,
            appointmentId: appointmentId ?? null,
          },
        })),
      });
    }

    return Response.json({
      roomId,
      roomLink,
      appointmentId,
      notifiedDoctors,
      onCallDoctors: onCallDoctors.map((d) => ({
        id: onCallDoctorUsers.find((u) => u.phone === d.doctorPhone)?.id || null,
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
