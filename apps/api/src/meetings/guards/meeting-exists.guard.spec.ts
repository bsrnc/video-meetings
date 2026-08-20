import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { MeetingExistsGuard } from './meeting-exists.guard';

function fakeContext(meetingId: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ params: { id: meetingId } }),
    }),
  } as unknown as ExecutionContext;
}

describe('MeetingExistsGuard', () => {
  it('allows the request when the meeting exists', async () => {
    const prisma = {
      meeting: { findUnique: jest.fn().mockResolvedValue({ id: 'm1' }) },
    };
    const guard = new MeetingExistsGuard(prisma as never);

    await expect(guard.canActivate(fakeContext('m1'))).resolves.toBe(true);
  });

  it('throws NotFoundException without touching the request body when the meeting is missing', async () => {
    const prisma = {
      meeting: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const guard = new MeetingExistsGuard(prisma as never);

    await expect(guard.canActivate(fakeContext('missing'))).rejects.toThrow(
      NotFoundException,
    );
  });
});
