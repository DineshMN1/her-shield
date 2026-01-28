import { Controller, Post, Get, Param, UseGuards, Req, Put } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VideoService } from './video.service';

@Controller('video')
@UseGuards(JwtAuthGuard)
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post('create/:appointmentId')
  async createRoom(
    @Param('appointmentId') appointmentId: string, 
    @Req() req: any
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.videoService.createVideoRoom(appointmentId, userId);
  }

  @Get('details/:appointmentId')
  async getRoomDetails(
    @Param('appointmentId') appointmentId: string, 
    @Req() req: any
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.videoService.getVideoRoomDetails(appointmentId, userId);
  }

  @Put('end/:appointmentId')
  async endCall(
    @Param('appointmentId') appointmentId: string,
    @Req() req: any
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.videoService.endVideoCall(appointmentId, userId);
  }
}
