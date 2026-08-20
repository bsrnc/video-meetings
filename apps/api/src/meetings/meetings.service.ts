import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { fromFile as fileTypeFromFile } from 'file-type';
import { Meeting, RecordingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { isAllowedRecordingMimeType } from './recording-upload.constants';

function extractMessage(error: HttpException): string {
  const response = error.getResponse();
  if (typeof response === 'string') {
    return response;
  }
  if (
    response &&
    typeof response === 'object' &&
    'message' in response &&
    typeof response.message === 'string'
  ) {
    return response.message;
  }
  return error.message;
}

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

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

  async uploadRecording(
    meetingId: string,
    file: Express.Multer.File,
  ): Promise<Meeting> {
    try {
      await this.findOne(meetingId);

      await this.prisma.meeting.update({
        where: { id: meetingId },
        data: {
          recordingStatus: RecordingStatus.UPLOADING,
          recordingError: null,
        },
      });

      const detected = await fileTypeFromFile(file.path);
      if (!detected || !isAllowedRecordingMimeType(detected.mime)) {
        throw new UnsupportedMediaTypeException(
          detected
            ? `Недопустимый тип файла: ${detected.mime}`
            : 'Не удалось определить тип файла',
        );
      }

      const key = `meetings/${meetingId}/recording`;
      await this.storageService.upload(
        key,
        createReadStream(file.path),
        detected.mime,
      );

      return await this.prisma.meeting.update({
        where: { id: meetingId },
        data: {
          recordingKey: key,
          recordingStatus: RecordingStatus.READY,
          recordingError: null,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      const message =
        error instanceof HttpException
          ? extractMessage(error)
          : 'Не удалось сохранить запись';
      await this.prisma.meeting
        .update({
          where: { id: meetingId },
          data: {
            recordingStatus: RecordingStatus.ERROR,
            recordingError: message,
          },
        })
        .catch(() => undefined);

      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException('Не удалось сохранить запись');
    } finally {
      await unlink(file.path).catch(() => undefined);
    }
  }
}
