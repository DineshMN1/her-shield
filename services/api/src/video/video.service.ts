import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

@Injectable()
export class VideoService {
  private agoraAppId: string;
  private agoraAppCertificate: string;

  constructor(private prisma: PrismaService) {
    this.agoraAppId = process.env.AGORA_APP_ID || '';
    this.agoraAppCertificate = process.env.AGORA_APP_CERTIFICATE || '';
  }

  async createVideoRoom(appointmentId: string, userId: string) {
    // Verify appointment exists and user is authorized
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { 
        patient: true, 
        doctor: true 
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Check if user is part of this appointment
    if (appointment.patientId !== userId && appointment.doctorId !== userId) {
      throw new NotFoundException('Unauthorized access to this appointment');
    }

    // Generate unique channel name
    const channelName = `healthsos_${appointmentId}`;
    
    // Generate numeric UID (Agora requires number type)
    const uid = Math.floor(Math.random() * 1000000);
    
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600; // 1 hour
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Generate Agora RTC token
    const token = RtcTokenBuilder.buildTokenWithUid(
      this.agoraAppId,
      this.agoraAppCertificate,
      channelName,
      uid,
      role,
      privilegeExpiredTs,
    );

    // Update appointment with room ID
    await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { roomId: channelName },
    });

    return {
      token,
      channel: channelName,
      appId: this.agoraAppId,
      uid,
      appointmentId,
      expiresAt: new Date(privilegeExpiredTs * 1000).toISOString(),
    };
  }

  async getVideoRoomDetails(appointmentId: string, userId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { 
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          }
        }, 
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          }
        }
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.patientId !== userId && appointment.doctorId !== userId) {
      throw new NotFoundException('Unauthorized access to this appointment');
    }

    return {
      appointmentId: appointment.id,
      doctorName: `${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
      doctorAvatar: appointment.doctor.avatar,
      patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
      patientAvatar: appointment.patient.avatar,
      scheduledAt: appointment.scheduledAt, // ✅ Correct field name
      duration: appointment.duration,
      status: appointment.status,
      roomId: appointment.roomId,
    };
  }

  async endVideoCall(appointmentId: string, userId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.patientId !== userId && appointment.doctorId !== userId) {
      throw new NotFoundException('Unauthorized');
    }

    // Update appointment status to completed
    await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { 
        status: 'COMPLETED',
        updatedAt: new Date(),
      },
    });

    return { success: true, message: 'Video call ended' };
  }
}
