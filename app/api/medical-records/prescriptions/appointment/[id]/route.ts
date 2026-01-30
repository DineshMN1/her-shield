import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// GET /api/medical-records/prescriptions/appointment/[id] - Get prescription by appointment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { id: appointmentId } = await params;

  try {
    const prescription = await prisma.prescription.findUnique({
      where: { appointmentId },
      include: {
        appointment: {
          include: {
            patient: { select: { id: true, firstName: true, lastName: true } },
            doctor: {
              include: { doctorProfile: { select: { specialization: true } } },
            },
          },
        },
      },
    });

    if (!prescription) {
      return Response.json({ message: 'Prescription not found' }, { status: 404 });
    }

    // Check access
    if (prescription.appointment.patientId !== user.id &&
        prescription.appointment.doctorId !== user.id) {
      return forbiddenResponse();
    }

    return Response.json({ prescription });
  } catch (error) {
    console.error('Get prescription error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
