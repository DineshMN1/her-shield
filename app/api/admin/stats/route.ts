import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// GET /api/admin/stats - Get admin dashboard statistics
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  if (user.role !== 'ADMIN') {
    return forbiddenResponse();
  }

  try {
    const [
      totalUsers,
      totalPatients,
      totalDoctors,
      totalOrganizations,
      activeOrganizations,
      totalAppointments,
      scheduledAppointments,
      completedAppointments,
      totalEmergencyCalls,
      activeEmergencyCalls,
      totalPrescriptions,
      totalSOSAlerts,
      recentUsers,
      recentAppointments,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'PATIENT' } }),
      prisma.user.count({ where: { role: 'DOCTOR' } }),
      prisma.organization.count(),
      prisma.organization.count({ where: { isActive: true } }),
      prisma.appointment.count(),
      prisma.appointment.count({ where: { status: 'SCHEDULED' } }),
      prisma.appointment.count({ where: { status: 'COMPLETED' } }),
      prisma.emergencyCall.count(),
      prisma.emergencyCall.count({ where: { status: { in: ['WAITING', 'ESCALATED'] } } }),
      prisma.prescription.count(),
      prisma.sOSAlert.count(),
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      }),
      prisma.appointment.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { firstName: true, lastName: true } },
          doctor: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    return Response.json({
      stats: {
        totalUsers,
        totalPatients,
        totalDoctors,
        totalOrganizations,
        activeOrganizations,
        totalAppointments,
        scheduledAppointments,
        completedAppointments,
        totalEmergencyCalls,
        activeEmergencyCalls,
        totalPrescriptions,
        totalSOSAlerts,
      },
      recentUsers: recentUsers.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      })),
      recentAppointments: recentAppointments.map((a) => ({
        id: a.id,
        patientName: a.patient ? `${a.patient.firstName || ''} ${a.patient.lastName || ''}`.trim() : 'Unknown Patient',
        doctorName: a.doctor ? `${a.doctor.firstName || ''} ${a.doctor.lastName || ''}`.trim() : 'Unknown Doctor',
        scheduledAt: a.scheduledAt ? a.scheduledAt.toISOString() : '',
        status: a.status,
        type: a.type,
      })),
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
