import { IsString, IsDateString, IsEnum, IsOptional } from 'class-validator';

export enum AppointmentTypeDto {
  VIDEO = 'VIDEO',
  CLINIC = 'CLINIC',
}

export class CreateAppointmentDto {
  @IsString()
  doctorId: string;

  @IsDateString()
  date: string; // "2024-01-15"

  @IsString()
  time: string; // "10:30"

  @IsEnum(AppointmentTypeDto)
  type: AppointmentTypeDto;

  @IsString()
  @IsOptional()
  reason?: string;
}
