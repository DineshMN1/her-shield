import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  // GET /api/v1/users/patients - List all patients (for doctors)
  @Get('patients')
  @UseGuards(JwtAuthGuard)
  async getPatients() {
    const patients = await this.users.getPatients();
    return {
      patients: patients.map((p) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        phone: p.phone,
        avatar: p.avatar,
        patientProfile: p.patientProfile,
      })),
    };
  }

  // GET /api/v1/users/:id - Get user by ID
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  get(@Param('id') id: string) {
    return this.users.findById(id);
  }
}
