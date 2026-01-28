import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SosService {
  constructor(private prisma: PrismaService) {}

  async createSOS(userId: string, data: any) {
    if (!data.latitude || !data.longitude) {
      throw new BadRequestException('Location required');
    }

    if (!userId) {
      throw new BadRequestException('Must be logged in');
    }

    const sos = await this.prisma.sOSAlert.create({
      data: {
        patientId: userId,
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        status: 'PENDING',
        urgencyLevel: data.urgencyLevel || 5,
        symptoms: data.symptoms || [],
        description: data.description || 'Emergency',
      },
    });

    return { success: true, sos, message: 'Emergency alert sent' };
  }

  async getUserSOS(userId: string) {
    return this.prisma.sOSAlert.findMany({
      where: { patientId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
