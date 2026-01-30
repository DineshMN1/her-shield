import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/hospitals - List doctors (hospitals endpoint returns doctors list)
export async function GET(request: NextRequest) {
  try {
    const doctors = await prisma.user.findMany({
      where: {
        role: 'DOCTOR',
        isActive: true,
      },
      include: {
        doctorProfile: true,
      },
    });

    return Response.json({
      doctors: doctors.map((doctor) => ({
        id: doctor.id,
        name: `${doctor.firstName} ${doctor.lastName}`,
        specialty: doctor.doctorProfile?.specialization || 'General',
        experience: doctor.doctorProfile?.yearsOfExperience || 0,
        rating: doctor.doctorProfile?.rating || 0,
        hospital: doctor.doctorProfile?.hospitalAffiliation || 'Health SOS Clinic',
        fee: doctor.doctorProfile?.consultationFee || 500,
        isAvailable: doctor.doctorProfile?.isAvailable ?? true,
      })),
    });
  } catch (error) {
    console.error('Fetch doctors error:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
