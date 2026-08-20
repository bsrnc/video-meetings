import { MEETING_GONE_MESSAGE } from '@/lib/meetings';

/**
 * Mirrors `RECORDING_MAX_FILE_SIZE_BYTES` in
 * `apps/api/src/meetings/recording-upload.constants.ts` (2 GiB). Checking it
 * here only saves the user a doomed upload — the API enforces the real limit.
 */
export const RECORDING_MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024;

/** Hint for the file picker. It filters the dialog, it does not enforce. */
export const RECORDING_FILE_ACCEPT = 'video/*,audio/*';

export const RECORDING_TOO_LARGE_MESSAGE =
  'That file is larger than the 2 GiB limit. Choose a smaller recording.';

/**
 * The formats behind `ALLOWED_RECORDING_MIME_TYPES` API-side, named by
 * extension: a person picking a file recognizes ".mov", not "video/quicktime".
 */
export const RECORDING_UNSUPPORTED_TYPE_MESSAGE =
  'That file is not a supported recording. Choose an MP4, WebM, MOV, MP3, WAV, M4A or OGG file.';

export const RECORDING_SAVE_FAILED_MESSAGE =
  'Could not save the recording. Please try again.';

export const RECORDING_NO_FILE_MESSAGE = 'Choose a recording file to upload.';

/**
 * How often the meeting page re-fetches `GET /meetings/:id` while
 * `recordingStatus` is `UPLOADING`. Catches an upload started in another tab
 * or a previous page load — the tab doing the actual `POST` learns the
 * outcome from its own response and does not need to wait for a poll tick.
 */
export const RECORDING_STATUS_POLL_INTERVAL_MS = 3000;

/**
 * Rejects what the API would certainly reject, before spending an upload on
 * it. Deliberately narrow: the browser reports an empty `type` for extensions
 * it does not know, and the API's magic-byte check — not the file's declared
 * type — is what actually decides, so anything uncertain is left to the API.
 */
export function validateRecordingFile(file: File): string | null {
  if (file.size > RECORDING_MAX_FILE_SIZE_BYTES) {
    return RECORDING_TOO_LARGE_MESSAGE;
  }
  if (
    file.type !== '' &&
    !file.type.startsWith('video/') &&
    !file.type.startsWith('audio/')
  ) {
    return RECORDING_UNSUPPORTED_TYPE_MESSAGE;
  }
  return null;
}

/** Maps an upload rejection onto copy that says what to do about it. */
export function recordingUploadErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return RECORDING_NO_FILE_MESSAGE;
    case 404:
      return MEETING_GONE_MESSAGE;
    case 413:
      return RECORDING_TOO_LARGE_MESSAGE;
    case 415:
      return RECORDING_UNSUPPORTED_TYPE_MESSAGE;
    default:
      // The API answers other failures in Russian while this UI is English,
      // so its message is not surfaced; only these are.
      return RECORDING_SAVE_FAILED_MESSAGE;
  }
}

const SIZE_UNITS = ['bytes', 'KB', 'MB', 'GB'] as const;

/** Human-readable file size, for confirming the picked file is the right one. */
export function formatFileSize(bytes: number): string {
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < SIZE_UNITS.length - 1) {
    size /= 1024;
    unit += 1;
  }
  const rounded = unit === 0 ? size : Math.round(size * 10) / 10;
  return `${rounded} ${SIZE_UNITS[unit]}`;
}
