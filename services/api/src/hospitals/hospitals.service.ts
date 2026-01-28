import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class HospitalsService {
  constructor(private prisma: PrismaService) {}

  // GET /api/v1/hospitals - Returns list of available doctors
  // (No Hospital model exists, so this returns doctors instead)
  async list() {
    const doctors = await this.prisma.user.findMany({
      where: {
        role: UserRole.DOCTOR,
        isActive: true,
      },
      include: {
        doctorProfile: true,
      },
      orderBy: [{ firstName: 'asc' }],
    });

    // Transform to match frontend contract
    return {
      doctors: doctors.map((doctor) => ({
        id: doctor.id,
        name: `${doctor.firstName} ${doctor.lastName}`,
        specialty: doctor.doctorProfile?.specialization || 'General',
        hospital: doctor.doctorProfile?.hospitalAffiliation,
        rating: doctor.doctorProfile?.rating || 0,
        totalReviews: doctor.doctorProfile?.totalReviews || 0,
        yearsOfExperience: doctor.doctorProfile?.yearsOfExperience || 0,
        consultationFee: doctor.doctorProfile?.consultationFee,
        avatar: doctor.avatar,
        bio: doctor.doctorProfile?.bio,
        isAvailable: doctor.doctorProfile?.isAvailable ?? true,
        availableHours: doctor.doctorProfile?.availableHours,
      })),
    };
  }

  // GET /api/v1/hospitals/:id - Get doctor details by ID
  async find(id: string) {
    const doctor = await this.prisma.user.findFirst({
      where: {
        id,
        role: UserRole.DOCTOR,
      },
      include: {
        doctorProfile: true,
      },
    });

    if (!doctor) {
      return null;
    }

    return {
      id: doctor.id,
      name: `${doctor.firstName} ${doctor.lastName}`,
      email: doctor.email,
      phone: doctor.phone,
      avatar: doctor.avatar,
      specialty: doctor.doctorProfile?.specialization,
      hospital: doctor.doctorProfile?.hospitalAffiliation,
      bio: doctor.doctorProfile?.bio,
      rating: doctor.doctorProfile?.rating,
      totalReviews: doctor.doctorProfile?.totalReviews,
      yearsOfExperience: doctor.doctorProfile?.yearsOfExperience,
      consultationFee: doctor.doctorProfile?.consultationFee,
      availableHours: doctor.doctorProfile?.availableHours,
      isAvailable: doctor.doctorProfile?.isAvailable ?? true,
    };
  }

  // Placeholder - no Hospital model in schema
  async create(name: string) {
    return {
      id: Date.now().toString(),
      name,
      message: 'Hospital creation not supported - no Hospital model in schema',
    };
  }

  // Get doctors with optional filters
  async findNearby(latitude: number, longitude: number, radiusKm = 10) {
    // Since there's no location data for hospitals/doctors,
    // just return all available doctors
    return this.list();
  }

  // Get all doctors (alternative method)
  async getDoctors(hospitalId?: string) {
    const doctors = await this.prisma.user.findMany({
      where: {
        role: UserRole.DOCTOR,
        isActive: true,
      },
      include: {
        doctorProfile: true,
      },
    });

    return doctors.map((doctor) => ({
      id: doctor.id,
      name: `${doctor.firstName} ${doctor.lastName}`,
      specialty: doctor.doctorProfile?.specialization || 'General',
      hospital: doctor.doctorProfile?.hospitalAffiliation,
      rating: doctor.doctorProfile?.rating || 0,
      consultationFee: doctor.doctorProfile?.consultationFee,
      avatar: doctor.avatar,
      isAvailable: doctor.doctorProfile?.isAvailable ?? true,
    }));
  }
}
