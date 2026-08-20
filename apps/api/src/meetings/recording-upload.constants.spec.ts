import {
  ALLOWED_RECORDING_MIME_TYPES,
  isAllowedRecordingMimeType,
  RECORDING_MAX_FILE_SIZE_BYTES,
} from './recording-upload.constants';

describe('isAllowedRecordingMimeType', () => {
  it('accepts every mime type in the allowed list', () => {
    for (const mimeType of ALLOWED_RECORDING_MIME_TYPES) {
      expect(isAllowedRecordingMimeType(mimeType)).toBe(true);
    }
  });

  it('rejects a mime type not in the allowed list', () => {
    expect(isAllowedRecordingMimeType('application/x-msdownload')).toBe(false);
  });
});

describe('RECORDING_MAX_FILE_SIZE_BYTES', () => {
  it('is a positive number of bytes', () => {
    expect(RECORDING_MAX_FILE_SIZE_BYTES).toBeGreaterThan(0);
  });
});
