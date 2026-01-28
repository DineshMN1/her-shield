import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SosService } from './sos.service';

@Controller('sos')
@UseGuards(JwtAuthGuard)
export class SosController {
  constructor(private sosService: SosService) {}

  @Post()
  async createSOS(@Body() body: any, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.sosService.createSOS(userId, body);
  }

  @Get()
  async getUserSOS(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.sosService.getUserSOS(userId);
  }
}
