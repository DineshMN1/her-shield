import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // POST /api/v1/appointments - Create appointment
  @Post()
  async create(@Body() dto: CreateAppointmentDto, @Req() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    return this.appointmentsService.create(userId, dto);
  }

  // GET /api/v1/appointments?status=upcoming|past - List user's appointments
  @Get()
  async findAll(@Query('status') status: string, @Req() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    const userRole = req.user?.role;
    return this.appointmentsService.findAll(userId, userRole, status);
  }

  // GET /api/v1/appointments/doctor/today - Doctor's today appointments
  @Get('doctor/today')
  async getDoctorToday(@Req() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    return this.appointmentsService.getDoctorTodayAppointments(userId);
  }

  // GET /api/v1/appointments/:id - Get appointment details
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    return this.appointmentsService.findOne(id, userId);
  }

  // PUT /api/v1/appointments/:id - Update appointment
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    return this.appointmentsService.update(id, userId, dto);
  }

  // DELETE /api/v1/appointments/:id - Cancel appointment
  @Delete(':id')
  async cancel(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    return this.appointmentsService.cancel(id, userId);
  }
}
