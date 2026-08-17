import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Meeting } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { MeetingsService } from './meetings.service';

@UseGuards(JwtAuthGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  create(@Body() dto: CreateMeetingDto): Promise<Meeting> {
    return this.meetingsService.create(dto.title);
  }

  @Get()
  findAll(): Promise<Meeting[]> {
    return this.meetingsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Meeting> {
    return this.meetingsService.findOne(id);
  }
}
