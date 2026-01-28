import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  async process(job: Job): Promise<any> {
    console.log('Processing notification job:', job.id);
    
    // Placeholder for notification logic
    return { success: true };
  }
}
