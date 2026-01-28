import { Controller, Post, Body } from '@nestjs/common';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post()
  async upload(@Body() body: any) {
    return this.uploadService.uploadFile(body);
  }
}
