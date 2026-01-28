import { Injectable } from '@nestjs/common';

@Injectable()
export class UploadService {
  async uploadFile(file: any) {
    // Placeholder for file upload
    return { success: true, message: 'Upload feature coming soon' };
  }
}
