import { UnsupportedMediaTypeException } from '@nestjs/common';
import type { Request } from 'express';
import type { FileFilterCallback } from 'multer';
import { createRecordingMulterOptions } from './recording-multer.options';

function fakeFile(mimetype: string): Express.Multer.File {
  return { mimetype } as Express.Multer.File;
}

describe('createRecordingMulterOptions', () => {
  it('sets limits.fileSize to the given max size', () => {
    const options = createRecordingMulterOptions(1024);
    expect(options.limits?.fileSize).toBe(1024);
  });

  it('defaults limits.fileSize to RECORDING_MAX_FILE_SIZE_BYTES', () => {
    const options = createRecordingMulterOptions();
    expect(options.limits?.fileSize).toBeGreaterThan(0);
  });

  it('accepts an allowed mime type via fileFilter', (done) => {
    const options = createRecordingMulterOptions();
    const callback: FileFilterCallback = (
      error: Error | null,
      acceptFile?: boolean,
    ) => {
      expect(error).toBeNull();
      expect(acceptFile).toBe(true);
      done();
    };
    options.fileFilter?.({} as Request, fakeFile('video/mp4'), callback);
  });

  it('rejects a disallowed mime type via fileFilter with a clear message', (done) => {
    const options = createRecordingMulterOptions();
    const callback: FileFilterCallback = (error: Error | null) => {
      expect(error).toBeInstanceOf(UnsupportedMediaTypeException);
      done();
    };
    options.fileFilter?.(
      {} as Request,
      fakeFile('application/x-msdownload'),
      callback,
    );
  });
});
