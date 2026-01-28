import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { HospitalsService } from './hospitals.service';

@Controller('hospitals')
export class HospitalsController {
  constructor(private svc: HospitalsService) {}

  @Get()
  list() { return this.svc.list(); }

  @Post()
  create(@Body() body: { name: string }) { return this.svc.create(body.name); }

  @Get(':id')
  get(@Param('id') id: string) { return this.svc.find(id); }
}
