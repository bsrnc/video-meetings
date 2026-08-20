/** `RecordingStatus` from `apps/api/prisma/schema.prisma`. */
export type RecordingStatus = 'UPLOADING' | 'READY' | 'ERROR';

/** `Meeting` from `apps/api/prisma/schema.prisma`, as serialized over JSON. */
export interface Meeting {
  id: string;
  title: string;
  /** ISO-8601 timestamp. */
  createdAt: string;
  /** Object storage key of the uploaded recording; `null` until one is saved. */
  recordingKey?: string | null;
  /** `null` while no upload has ever been attempted for this meeting. */
  recordingStatus?: RecordingStatus | null;
  /** Set by the API alongside `recordingStatus: 'ERROR'`. */
  recordingError?: string | null;
}

/** Newest first. The API returns meetings in insertion order, not sorted. */
export function sortByNewest(meetings: Meeting[]): Meeting[] {
  return [...meetings].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}
