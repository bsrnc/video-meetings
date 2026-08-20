import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { fromFile as fileTypeFromFile } from 'file-type';
import { Meeting, RecordingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { isAllowedRecordingMimeType } from './recording-upload.constants';

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  // Serializes concurrent uploadRecording calls per meeting id: without
  // this, two requests uploading to the same deterministic storage key
  // could finish their S3 upload / DB update in a different order than
  // they started, leaving recordingStatus/recordingKey describing neither
  // attempt correctly. Different meeting ids never block each other.
  private readonly uploadLocks = new Map<string, Promise<void>>();

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

  uploadRecording(
    meetingId: string,
    file: Express.Multer.File,
  ): Promise<Meeting> {
    return this.runExclusive(meetingId, () =>
      this.doUploadRecording(meetingId, file),
    );
  }

  private async doUploadRecording(
    meetingId: string,
    file: Express.Multer.File,
  ): Promise<Meeting> {
    try {
      // Type validation runs before touching recordingStatus/recordingKey:
      // a rejected upload must not disturb a previously stored, still-valid
      // recording (MeetingExistsGuard already confirmed the meeting exists).
      const detected = await fileTypeFromFile(file.path);
      if (!detected || !isAllowedRecordingMimeType(detected.mime)) {
        throw new UnsupportedMediaTypeException(
          detected
            ? `Недопустимый тип файла: ${detected.mime}`
            : 'Не удалось определить тип файла',
        );
      }

      await this.prisma.meeting.update({
        where: { id: meetingId },
        data: {
          recordingStatus: RecordingStatus.UPLOADING,
          recordingError: null,
        },
      });

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
      if (error instanceof UnsupportedMediaTypeException) {
        throw error;
      }

      const message =
        error instanceof HttpException
          ? error.message
          : 'Не удалось сохранить запись';
      await this.prisma.meeting
        .update({
          where: { id: meetingId },
          data: {
            recordingStatus: RecordingStatus.ERROR,
            recordingError: message,
          },
        })
        .catch((updateError: unknown) => {
          this.logger.error(
            `Failed to mark meeting ${meetingId} recording as ERROR`,
            updateError instanceof Error
              ? updateError.stack
              : String(updateError),
          );
        });

      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException('Не удалось сохранить запись');
    } finally {
      await unlink(file.path).catch(() => undefined);
    }
  }

  private runExclusive<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.uploadLocks.get(key) ?? Promise.resolve();
    const settled = previous.then(task, task);
    const tail = settled.then(
      () => undefined,
      () => undefined,
    );
    this.uploadLocks.set(key, tail);
    void tail.finally(() => {
      if (this.uploadLocks.get(key) === tail) {
        this.uploadLocks.delete(key);
      }
    });
    return settled;
  }
}
