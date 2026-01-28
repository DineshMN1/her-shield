import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(data: any) {
    // ✅ Check if email exists
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // ✅ Check if phone exists
    const existingPhone = await this.prisma.user.findUnique({
      where: { phone: data.phone },
    });
    if (existingPhone) {
      throw new ConflictException('Phone number already registered');
    }

    const hash = await bcrypt.hash(data.password, 10);
    
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        password: hash,
        firstName: data.firstName,
        lastName: data.lastName || '',
        role: data.role || UserRole.PATIENT,
      },
    });

    const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    
    const { password, ...userWithoutPassword } = user;
    
    return { user: userWithoutPassword, token };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    
    const { password: _, ...userWithoutPassword } = user;
    
    return { user: userWithoutPassword, token };
  }
}
