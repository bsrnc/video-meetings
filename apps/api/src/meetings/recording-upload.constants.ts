// Decided limit/allowed-types for Phase 1 meeting recording upload
// (research-meeting-upload.md left both open; fixed here per plan issue #3).
export const RECORDING_MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GiB

export const ALLOWED_RECORDING_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/ogg',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/ogg',
] as const;

export type AllowedRecordingMimeType =
  (typeof ALLOWED_RECORDING_MIME_TYPES)[number];

export function isAllowedRecordingMimeType(
  mimeType: string,
): mimeType is AllowedRecordingMimeType {
  return (ALLOWED_RECORDING_MIME_TYPES as readonly string[]).includes(mimeType);
}
