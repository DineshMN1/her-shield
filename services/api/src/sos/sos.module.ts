import { Module } from '@nestjs/common';
import { SosService } from './sos.service';
import { SosController } from './sos.controller';
import { PrismaService } from '../prisma/prisma.service';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [JobsModule],
  controllers: [SosController],
  providers: [SosService, PrismaService],
  exports: [SosService]
})
export class SosModule {}
