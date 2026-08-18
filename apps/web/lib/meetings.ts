/** `Meeting` from `apps/api/prisma/schema.prisma`, as serialized over JSON. */
export interface Meeting {
  id: string;
  title: string;
  /** ISO-8601 timestamp. */
  createdAt: string;
}

/** Newest first. The API returns meetings in insertion order, not sorted. */
export function sortByNewest(meetings: Meeting[]): Meeting[] {
  return [...meetings].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}
