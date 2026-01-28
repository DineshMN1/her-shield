import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatus, UserRole, AppointmentType } from '@prisma/client';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  // Create appointment (Patient only)
  async create(patientId: string, dto: CreateAppointmentDto) {
    // Validate doctor exists and is a DOCTOR role
    const doctor = await this.prisma.user.findFirst({
      where: {
        id: dto.doctorId,
        role: UserRole.DOCTOR,
        isActive: true,
      },
      include: { doctorProfile: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found or unavailable');
    }

    if (doctor.doctorProfile && !doctor.doctorProfile.isAvailable) {
      throw new BadRequestException('Doctor is not currently available');
    }

    // Parse date and time into scheduledAt
    const scheduledAt = this.parseDateTime(dto.date, dto.time);

    // Check for scheduling conflicts
    const conflict = await this.checkConflict(dto.doctorId, scheduledAt);
    if (conflict) {
      throw new BadRequestException('This time slot is not available');
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        patientId,
        doctorId: dto.doctorId,
        scheduledAt,
        type: dto.type as AppointmentType,
        reason: dto.reason,
        status: AppointmentStatus.SCHEDULED,
        duration: 30,
      },
      include: {
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            doctorProfile: {
              select: { specialization: true },
            },
          },
        },
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return { appointment, message: 'Appointment booked successfully' };
  }

  // Get appointments with filter (for patient or doctor)
  async findAll(userId: string, userRole: string, filter?: string) {
    const now = new Date();

    const whereClause: any =
      userRole === UserRole.DOCTOR
        ? { doctorId: userId }
        : { patientId: userId };

    if (filter === 'upcoming') {
      whereClause.scheduledAt = { gte: now };
      whereClause.status = {
        in: [AppointmentStatus.SCHEDULED, AppointmentStatus.IN_PROGRESS],
      };
    } else if (filter === 'past') {
      whereClause.OR = [
        { scheduledAt: { lt: now } },
        {
          status: {
            in: [
              AppointmentStatus.COMPLETED,
              AppointmentStatus.CANCELLED,
              AppointmentStatus.NO_SHOW,
            ],
          },
        },
      ];
    }

    const appointments = await this.prisma.appointment.findMany({
      where: whereClause,
      include: {
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            doctorProfile: {
              select: { specialization: true, hospitalAffiliation: true },
            },
          },
        },
        patient: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
      orderBy: { scheduledAt: filter === 'upcoming' ? 'asc' : 'desc' },
    });

    // Transform to match frontend contract
    return {
      appointments: appointments.map((apt) =>
        this.transformAppointment(apt, userRole),
      ),
    };
  }

  // Get single appointment by ID
  async findOne(appointmentId: string, userId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            doctorProfile: {
              select: {
                specialization: true,
                hospitalAffiliation: true,
                consultationFee: true,
              },
            },
          },
        },
        patient: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Verify user is participant
    if (appointment.patientId !== userId && appointment.doctorId !== userId) {
      throw new ForbiddenException('Access denied to this appointment');
    }

    return {
      appointment: {
        id: appointment.id,
        doctorId: appointment.doctor.id,
        doctorName: `${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
        doctorAvatar: appointment.doctor.avatar,
        specialty: appointment.doctor.doctorProfile?.specialization,
        hospital: appointment.doctor.doctorProfile?.hospitalAffiliation,
        consultationFee: appointment.doctor.doctorProfile?.consultationFee,
        patientId: appointment.patient.id,
        patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
        patientAvatar: appointment.patient.avatar,
        date: appointment.scheduledAt.toISOString(),
        time: appointment.scheduledAt.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
        type: appointment.type,
        status: appointment.status,
        reason: appointment.reason,
        notes: appointment.notes,
        aiSummary: appointment.aiSummary,
        roomId: appointment.roomId,
        duration: appointment.duration,
      },
    };
  }

  // Get doctor's today appointments
  async getDoctorTodayAppointments(doctorId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        scheduledAt: {
          gte: today,
          lt: tomorrow,
        },
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.IN_PROGRESS],
        },
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return {
      appointments: appointments.map((apt) => ({
        id: apt.id,
        patientName: `${apt.patient.firstName} ${apt.patient.lastName}`,
        patientAvatar: apt.patient.avatar,
        time: apt.scheduledAt.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        type: apt.type,
        status: apt.status,
        reason: apt.reason,
      })),
    };
  }

  // Update appointment (status, notes, etc.)
  async update(
    appointmentId: string,
    userId: string,
    dto: UpdateAppointmentDto,
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.patientId !== userId && appointment.doctorId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: dto,
      include: {
        doctor: {
          select: { id: true, firstName: true, lastName: true },
        },
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return { appointment: updated };
  }

  // Cancel appointment
  async cancel(appointmentId: string, userId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.patientId !== userId && appointment.doctorId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new BadRequestException('Can only cancel scheduled appointments');
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.CANCELLED },
    });

    return { appointment: updated, message: 'Appointment cancelled' };
  }

  // Helper: Parse date and time strings
  private parseDateTime(date: string, time: string): Date {
    // date: "2024-01-15", time: "10:30"
    const [hours, minutes] = time.split(':').map(Number);
    const dateTime = new Date(date);
    dateTime.setHours(hours, minutes, 0, 0);
    return dateTime;
  }

  // Helper: Check for scheduling conflicts
  private async checkConflict(
    doctorId: string,
    scheduledAt: Date,
  ): Promise<boolean> {
    const bufferMinutes = 30;
    const startWindow = new Date(scheduledAt.getTime() - bufferMinutes * 60000);
    const endWindow = new Date(scheduledAt.getTime() + bufferMinutes * 60000);

    const existing = await this.prisma.appointment.findFirst({
      where: {
        doctorId,
        scheduledAt: {
          gte: startWindow,
          lte: endWindow,
        },
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.IN_PROGRESS],
        },
      },
    });

    return !!existing;
  }

  // Helper: Transform appointment for frontend
  private transformAppointment(apt: any, userRole: string) {
    return {
      id: apt.id,
      doctorName: `${apt.doctor.firstName} ${apt.doctor.lastName}`,
      doctorId: apt.doctor.id,
      doctorAvatar: apt.doctor.avatar,
      specialty: apt.doctor.doctorProfile?.specialization,
      patientName: `${apt.patient.firstName} ${apt.patient.lastName}`,
      patientId: apt.patient.id,
      patientAvatar: apt.patient.avatar,
      date: apt.scheduledAt.toISOString(),
      time: apt.scheduledAt.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
      type: apt.type,
      status: apt.status,
      reason: apt.reason,
    };
  }
}
