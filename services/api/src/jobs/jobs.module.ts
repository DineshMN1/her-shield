import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import './notification.processor'; // side-effect: starts worker for dev

@Module({
  providers: [PrismaService],
})
export class JobsModule {}
