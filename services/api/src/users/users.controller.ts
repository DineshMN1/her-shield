import { Controller, Get, Param, Query } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get(':id')
  get(@Param('id') id: string) {
    return this.users.findById(id);
  }

  @Get('/')
  list(@Query('hospitalId') hospitalId?: string) {
    return this.users.listPatients(hospitalId);
  }
}
