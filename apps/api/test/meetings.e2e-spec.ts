import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

function uniqueEmail(): string {
  return `${randomUUID()}@example.com`;
}

interface Meeting {
  id: string;
  title: string;
  createdAt: string;
}

describe('Meetings (e2e)', () => {
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

  describe('POST /meetings', () => {
    it('creates a new meeting for an authenticated user', async () => {
      const token = await getAuthToken();

      const response = await request(app.getHttpServer())
        .post('/meetings')
        .set(...authHeader(token))
        .send({ title: 'Sprint planning' })
        .expect(201);

      const meeting = response.body as Meeting;
      expect(typeof meeting.id).toBe('string');
      expect(meeting.title).toBe('Sprint planning');
      expect(typeof meeting.createdAt).toBe('string');
    });

    it('rejects creating a meeting without a title', async () => {
      const token = await getAuthToken();

      await request(app.getHttpServer())
        .post('/meetings')
        .set(...authHeader(token))
        .send({})
        .expect(400);
    });

    it('rejects the request when not authenticated', async () => {
      await request(app.getHttpServer())
        .post('/meetings')
        .send({ title: 'Sprint planning' })
        .expect(401);
    });

    it('rejects the request when the token is invalid', async () => {
      await request(app.getHttpServer())
        .post('/meetings')
        .set('Authorization', 'Bearer not-a-real-token')
        .send({ title: 'Sprint planning' })
        .expect(401);
    });
  });

  describe('GET /meetings', () => {
    it('lists meetings created by the authenticated user', async () => {
      const token = await getAuthToken();

      const createResponse = await request(app.getHttpServer())
        .post('/meetings')
        .set(...authHeader(token))
        .send({ title: 'Sprint planning' })
        .expect(201);
      const createdMeeting = createResponse.body as Meeting;

      const listResponse = await request(app.getHttpServer())
        .get('/meetings')
        .set(...authHeader(token))
        .expect(200);

      const meetings = listResponse.body as Meeting[];
      expect(meetings.some((meeting) => meeting.id === createdMeeting.id)).toBe(
        true,
      );
    });

    it('rejects the request when not authenticated', async () => {
      await request(app.getHttpServer()).get('/meetings').expect(401);
    });
  });

  describe('GET /meetings/:id', () => {
    it('returns a single meeting by id for the authenticated user', async () => {
      const token = await getAuthToken();

      const createResponse = await request(app.getHttpServer())
        .post('/meetings')
        .set(...authHeader(token))
        .send({ title: 'Sprint planning' })
        .expect(201);
      const createdMeeting = createResponse.body as Meeting;

      const getResponse = await request(app.getHttpServer())
        .get(`/meetings/${createdMeeting.id}`)
        .set(...authHeader(token))
        .expect(200);

      const meeting = getResponse.body as Meeting;
      expect(meeting.id).toBe(createdMeeting.id);
      expect(meeting.title).toBe('Sprint planning');
    });

    it('returns 404 when the meeting does not exist', async () => {
      const token = await getAuthToken();

      await request(app.getHttpServer())
        .get(`/meetings/${randomUUID()}`)
        .set(...authHeader(token))
        .expect(404);
    });

    it('rejects the request when not authenticated', async () => {
      await request(app.getHttpServer())
        .get(`/meetings/${randomUUID()}`)
        .expect(401);
    });
  });
});
