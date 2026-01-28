import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MedicalRecordsService {
  constructor(private prisma: PrismaService) {}

  // ============ PRESCRIPTIONS ============

  async createPrescription(appointmentId: string, doctorId: string, data: {
    diagnosis: string;
    medicines: any[];
    advice?: string;
    followUpDate?: Date;
  }) {
    // Verify appointment belongs to this doctor
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.doctorId !== doctorId) {
      throw new ForbiddenException('Only the assigned doctor can create prescriptions');
    }

    return this.prisma.prescription.create({
      data: {
        appointmentId,
        diagnosis: data.diagnosis,
        medicines: data.medicines,
        advice: data.advice,
        followUpDate: data.followUpDate,
      },
      include: {
        appointment: {
          include: {
            patient: { select: { firstName: true, lastName: true } },
            doctor: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  async getPrescription(appointmentId: string, userId: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { appointmentId },
      include: {
        appointment: {
          include: {
            patient: { select: { id: true, firstName: true, lastName: true } },
            doctor: {
              select: { id: true, firstName: true, lastName: true },
              include: { doctorProfile: { select: { specialization: true } } },
            },
          },
        },
      },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    // Check access
    if (prescription.appointment.patientId !== userId &&
        prescription.appointment.doctorId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return prescription;
  }

  async getPatientPrescriptions(patientId: string) {
    return this.prisma.prescription.findMany({
      where: {
        appointment: { patientId },
      },
      include: {
        appointment: {
          include: {
            doctor: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============ CONSULTATION REPORTS ============

  async createReport(appointmentId: string, doctorId: string, data: {
    chiefComplaint: string;
    examination?: string;
    diagnosis: string;
    treatmentPlan?: string;
    vitals?: any;
    recommendations?: string[];
  }) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.doctorId !== doctorId) {
      throw new ForbiddenException('Only the assigned doctor can create reports');
    }

    return this.prisma.consultationReport.create({
      data: {
        appointmentId,
        chiefComplaint: data.chiefComplaint,
        examination: data.examination,
        diagnosis: data.diagnosis,
        treatmentPlan: data.treatmentPlan,
        vitals: data.vitals,
        recommendations: data.recommendations || [],
      },
      include: {
        appointment: {
          include: {
            patient: { select: { firstName: true, lastName: true } },
            doctor: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  async getReport(appointmentId: string, userId: string) {
    const report = await this.prisma.consultationReport.findUnique({
      where: { appointmentId },
      include: {
        appointment: {
          include: {
            patient: { select: { id: true, firstName: true, lastName: true } },
            doctor: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.appointment.patientId !== userId &&
        report.appointment.doctorId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return report;
  }

  // ============ MEDICAL SCANS ============

  async uploadScan(patientId: string, data: {
    title: string;
    scanType: string;
    fileUrl: string;
    fileType: string;
    notes?: string;
    appointmentId?: string;
    scanDate?: Date;
  }) {
    return this.prisma.medicalScan.create({
      data: {
        patientId,
        title: data.title,
        scanType: data.scanType,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        notes: data.notes,
        appointmentId: data.appointmentId,
        scanDate: data.scanDate || new Date(),
      },
    });
  }

  async getPatientScans(patientId: string) {
    return this.prisma.medicalScan.findMany({
      where: { patientId },
      orderBy: { scanDate: 'desc' },
    });
  }

  async getScan(scanId: string, userId: string) {
    const scan = await this.prisma.medicalScan.findUnique({
      where: { id: scanId },
    });

    if (!scan) {
      throw new NotFoundException('Scan not found');
    }

    // Check if user is the patient or their doctor
    if (scan.patientId !== userId) {
      const isDoctor = await this.prisma.appointment.findFirst({
        where: {
          patientId: scan.patientId,
          doctorId: userId,
        },
      });
      if (!isDoctor) {
        throw new ForbiddenException('Access denied');
      }
    }

    return scan;
  }

  async deleteScan(scanId: string, patientId: string) {
    const scan = await this.prisma.medicalScan.findUnique({
      where: { id: scanId },
    });

    if (!scan) {
      throw new NotFoundException('Scan not found');
    }

    if (scan.patientId !== patientId) {
      throw new ForbiddenException('Only the patient can delete their scans');
    }

    return this.prisma.medicalScan.delete({
      where: { id: scanId },
    });
  }

  // ============ APPOINTMENT RECORDS ============

  async getAppointmentRecords(appointmentId: string, userId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        doctor: {
          select: { id: true, firstName: true, lastName: true },
        },
        prescription: true,
        report: true,
        scans: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.patientId !== userId && appointment.doctorId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return appointment;
  }
}
