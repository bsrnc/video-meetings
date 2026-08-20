import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

// Runs before FileInterceptor (Nest guards execute before interceptors),
// so a request for a nonexistent meeting 404s before the multipart body
// is ever read — without this, any authenticated user could force the
// server to fully receive and disk-write up to the size limit against a
// meeting id that doesn't exist.
@Injectable()
export class MeetingExistsGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const meetingId = String(request.params.id);

    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true },
    });
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    return true;
  }
}
