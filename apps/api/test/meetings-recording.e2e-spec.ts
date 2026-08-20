import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

function uniqueEmail(): string {
  return `${randomUUID()}@example.com`;
}

function minimalWavBuffer(): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(8000, 24); // sample rate
  header.writeUInt32LE(8000, 28); // byte rate
  header.writeUInt16LE(1, 32); // block align
  header.writeUInt16LE(8, 34); // bits per sample
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(0, 40);
  return header;
}

interface Meeting {
  id: string;
  title: string;
  createdAt: string;
  recordingKey: string | null;
  recordingStatus: 'UPLOADING' | 'READY' | 'ERROR' | null;
  recordingError: string | null;
}

describe('Meetings recording upload (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  async function getAuthToken(): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: uniqueEmail(), password: 'correct-password' })
      .expect(201);

    const body = response.body as { accessToken: string };
    return body.accessToken;
  }

  function authHeader(token: string): [string, string] {
    return ['Authorization', `Bearer ${token}`];
  }

  async function createMeeting(token: string): Promise<Meeting> {
    const response = await request(app.getHttpServer())
      .post('/meetings')
      .set(...authHeader(token))
      .send({ title: 'Sprint planning' })
      .expect(201);
    return response.body as Meeting;
  }

  describe('POST /meetings/:id/recording', () => {
    it('stores a valid recording and marks the meeting READY', async () => {
      const token = await getAuthToken();
      const meeting = await createMeeting(token);

      const response = await request(app.getHttpServer())
        .post(`/meetings/${meeting.id}/recording`)
        .set(...authHeader(token))
        .attach('file', minimalWavBuffer(), {
          filename: 'recording.wav',
          contentType: 'audio/wav',
        })
        .expect(201);

      const updated = response.body as Meeting;
      expect(updated.recordingStatus).toBe('READY');
      expect(typeof updated.recordingKey).toBe('string');
      expect(updated.recordingKey).toContain(meeting.id);

      const getResponse = await request(app.getHttpServer())
        .get(`/meetings/${meeting.id}`)
        .set(...authHeader(token))
        .expect(200);
      expect((getResponse.body as Meeting).recordingStatus).toBe('READY');
    });

    it('is accessible to any authenticated user, not just the meeting creator', async () => {
      const creatorToken = await getAuthToken();
      const meeting = await createMeeting(creatorToken);
      const otherUserToken = await getAuthToken();

      await request(app.getHttpServer())
        .post(`/meetings/${meeting.id}/recording`)
        .set(...authHeader(otherUserToken))
        .attach('file', minimalWavBuffer(), {
          filename: 'recording.wav',
          contentType: 'audio/wav',
        })
        .expect(201);
    });

    it('rejects a file whose real type is not an allowed video/audio type', async () => {
      const token = await getAuthToken();
      const meeting = await createMeeting(token);

      const response = await request(app.getHttpServer())
        .post(`/meetings/${meeting.id}/recording`)
        .set(...authHeader(token))
        .attach('file', Buffer.from('just plain text, not a recording'), {
          filename: 'notes.txt',
          contentType: 'text/plain',
        })
        .expect(415);

      const body = response.body as { message: string };
      expect(typeof body.message).toBe('string');
      expect(body.message.length).toBeGreaterThan(0);

      const getResponse = await request(app.getHttpServer())
        .get(`/meetings/${meeting.id}`)
        .set(...authHeader(token))
        .expect(200);
      expect((getResponse.body as Meeting).recordingStatus).not.toBe('READY');
    });

    it('returns 404 when the meeting does not exist', async () => {
      const token = await getAuthToken();

      await request(app.getHttpServer())
        .post(`/meetings/${randomUUID()}/recording`)
        .set(...authHeader(token))
        .attach('file', minimalWavBuffer(), {
          filename: 'recording.wav',
          contentType: 'audio/wav',
        })
        .expect(404);
    });

    it('rejects the request when not authenticated', async () => {
      const token = await getAuthToken();
      const meeting = await createMeeting(token);

      await request(app.getHttpServer())
        .post(`/meetings/${meeting.id}/recording`)
        .attach('file', minimalWavBuffer(), {
          filename: 'recording.wav',
          contentType: 'audio/wav',
        })
        .expect(401);
    });
  });
});
