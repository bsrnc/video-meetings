import { Injectable, NotFoundException } from '@nestjs/common';
import { Meeting } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MeetingsService {
  constructor(private readonly prisma: PrismaService) {}

  create(title: string): Promise<Meeting> {
    return this.prisma.meeting.create({ data: { title } });
  }

  findAll(): Promise<Meeting[]> {
    return this.prisma.meeting.findMany();
  }

  async findOne(id: string): Promise<Meeting> {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    return meeting;
  }
}
