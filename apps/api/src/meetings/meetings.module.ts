import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { createRecordingMulterOptions } from './recording-multer.options';

@Module({
  imports: [
    AuthModule,
    StorageModule,
    MulterModule.register(createRecordingMulterOptions()),
  ],
  controllers: [MeetingsController],
  providers: [MeetingsService],
})
export class MeetingsModule {}
