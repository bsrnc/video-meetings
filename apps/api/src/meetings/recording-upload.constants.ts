// Decided limit/allowed-types for Phase 1 meeting recording upload
// (research-meeting-upload.md left both open; fixed here per plan issue #3).
export const RECORDING_MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GiB

// Values match what file-type's magic-byte detection actually returns
// (checked against the installed file-type version) since that detector,
// not the client-declared header, is the source of truth for validation.
export const ALLOWED_RECORDING_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/ogg',
  'audio/mpeg',
  'audio/vnd.wave',
  'audio/mp4',
  'audio/x-m4a',
  'audio/ogg',
] as const;

export type AllowedRecordingMimeType =
  (typeof ALLOWED_RECORDING_MIME_TYPES)[number];

export function isAllowedRecordingMimeType(
  mimeType: string,
): mimeType is AllowedRecordingMimeType {
  return (ALLOWED_RECORDING_MIME_TYPES as readonly string[]).includes(mimeType);
}
