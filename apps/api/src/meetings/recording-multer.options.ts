import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { UnsupportedMediaTypeException } from '@nestjs/common';
import multer, { type Options } from 'multer';
import { RECORDING_MAX_FILE_SIZE_BYTES } from './recording-upload.constants';

// Cheap first-pass filter on the client-declared Content-Type, to reject
// obvious junk before spending I/O writing it to disk. The client-declared
// type can be spoofed (or absent/generic), so it's deliberately coarse —
// any video/audio type, plus the generic "unknown binary" type some upload
// clients default to for extensions they don't recognize — rather than the
// precise ALLOWED_RECORDING_MIME_TYPES list. MeetingsService.uploadRecording
// does the authoritative magic-byte check against that precise list.
function isPlausibleRecordingMimeType(mimetype: string): boolean {
  return (
    mimetype.startsWith('video/') ||
    mimetype.startsWith('audio/') ||
    mimetype === 'application/octet-stream'
  );
}

export function createRecordingMulterOptions(
  maxFileSizeBytes: number = RECORDING_MAX_FILE_SIZE_BYTES,
): Options {
  return {
    storage: multer.diskStorage({
      destination: tmpdir(),
      filename: (_req, _file, callback) => callback(null, randomUUID()),
    }),
    limits: { fileSize: maxFileSizeBytes },
    fileFilter: (_req, file, callback) => {
      if (!isPlausibleRecordingMimeType(file.mimetype)) {
        callback(
          new UnsupportedMediaTypeException(
            `Недопустимый тип файла: ${file.mimetype}. Ожидается видео или аудио запись встречи.`,
          ),
        );
        return;
      }
      callback(null, true);
    },
  };
}
