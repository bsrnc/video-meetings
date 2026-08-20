import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Meeting } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { MeetingExistsGuard } from './guards/meeting-exists.guard';
import { MeetingsService } from './meetings.service';
import { MulterExceptionFilter } from './multer-exception.filter';

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

  @Post(':id/recording')
  @UseGuards(MeetingExistsGuard)
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(FileInterceptor('file'))
  uploadRecording(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<Meeting> {
    if (!file) {
      throw new BadRequestException('Файл записи обязателен');
    }
    return this.meetingsService.uploadRecording(id, file);
  }
}
