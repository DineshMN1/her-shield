import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        patientProfile: true,
        doctorProfile: true,
      },
    });
  }

  async getDoctors() {
    return this.prisma.user.findMany({
      where: { role: UserRole.DOCTOR },
      include: { doctorProfile: true },
    });
  }

  async getPatients() {
    return this.prisma.user.findMany({
      where: { role: UserRole.PATIENT },
      include: { patientProfile: true },
    });
  }

  async listPatients(hospitalId?: string) {
    // ADDED METHOD
    return this.prisma.user.findMany({
      where: { role: UserRole.PATIENT },
      include: { patientProfile: true },
    });
  }
}
