import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MedicalRecordsService } from './medical-records.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('medical-records')
@UseGuards(JwtAuthGuard)
export class MedicalRecordsController {
  constructor(private medicalRecords: MedicalRecordsService) {}

  // ============ PRESCRIPTIONS ============

  // POST /api/v1/medical-records/prescriptions
  @Post('prescriptions')
  async createPrescription(
    @Request() req,
    @Body() body: {
      appointmentId: string;
      diagnosis: string;
      medicines: any[];
      advice?: string;
      followUpDate?: string;
    },
  ) {
    const prescription = await this.medicalRecords.createPrescription(
      body.appointmentId,
      req.user.id,
      {
        diagnosis: body.diagnosis,
        medicines: body.medicines,
        advice: body.advice,
        followUpDate: body.followUpDate ? new Date(body.followUpDate) : undefined,
      },
    );
    return { prescription };
  }

  // GET /api/v1/medical-records/prescriptions/appointment/:id
  @Get('prescriptions/appointment/:id')
  async getPrescription(@Request() req, @Param('id') appointmentId: string) {
    const prescription = await this.medicalRecords.getPrescription(
      appointmentId,
      req.user.id,
    );
    return { prescription };
  }

  // GET /api/v1/medical-records/prescriptions/my
  @Get('prescriptions/my')
  async getMyPrescriptions(@Request() req) {
    const prescriptions = await this.medicalRecords.getPatientPrescriptions(
      req.user.id,
    );
    return { prescriptions };
  }

  // ============ REPORTS ============

  // POST /api/v1/medical-records/reports
  @Post('reports')
  async createReport(
    @Request() req,
    @Body() body: {
      appointmentId: string;
      chiefComplaint: string;
      examination?: string;
      diagnosis: string;
      treatmentPlan?: string;
      vitals?: any;
      recommendations?: string[];
    },
  ) {
    const report = await this.medicalRecords.createReport(
      body.appointmentId,
      req.user.id,
      {
        chiefComplaint: body.chiefComplaint,
        examination: body.examination,
        diagnosis: body.diagnosis,
        treatmentPlan: body.treatmentPlan,
        vitals: body.vitals,
        recommendations: body.recommendations,
      },
    );
    return { report };
  }

  // GET /api/v1/medical-records/reports/appointment/:id
  @Get('reports/appointment/:id')
  async getReport(@Request() req, @Param('id') appointmentId: string) {
    const report = await this.medicalRecords.getReport(
      appointmentId,
      req.user.id,
    );
    return { report };
  }

  // ============ SCANS ============

  // POST /api/v1/medical-records/scans
  @Post('scans')
  async uploadScan(
    @Request() req,
    @Body() body: {
      title: string;
      scanType: string;
      fileUrl: string;
      fileType: string;
      notes?: string;
      appointmentId?: string;
      scanDate?: string;
    },
  ) {
    const scan = await this.medicalRecords.uploadScan(req.user.id, {
      title: body.title,
      scanType: body.scanType,
      fileUrl: body.fileUrl,
      fileType: body.fileType,
      notes: body.notes,
      appointmentId: body.appointmentId,
      scanDate: body.scanDate ? new Date(body.scanDate) : undefined,
    });
    return { scan };
  }

  // GET /api/v1/medical-records/scans
  @Get('scans')
  async getMyScans(@Request() req) {
    const scans = await this.medicalRecords.getPatientScans(req.user.id);
    return { scans };
  }

  // GET /api/v1/medical-records/scans/:id
  @Get('scans/:id')
  async getScan(@Request() req, @Param('id') scanId: string) {
    const scan = await this.medicalRecords.getScan(scanId, req.user.id);
    return { scan };
  }

  // DELETE /api/v1/medical-records/scans/:id
  @Delete('scans/:id')
  async deleteScan(@Request() req, @Param('id') scanId: string) {
    await this.medicalRecords.deleteScan(scanId, req.user.id);
    return { message: 'Scan deleted successfully' };
  }

  // ============ APPOINTMENT RECORDS ============

  // GET /api/v1/medical-records/appointment/:id
  @Get('appointment/:id')
  async getAppointmentRecords(
    @Request() req,
    @Param('id') appointmentId: string,
  ) {
    const records = await this.medicalRecords.getAppointmentRecords(
      appointmentId,
      req.user.id,
    );
    return { records };
  }
}
