import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

const JWT_PATTERN = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;

function uniqueEmail(): string {
  return `${randomUUID()}@example.com`;
}

describe('Auth (e2e)', () => {
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

  describe('POST /auth/register', () => {
    it('creates a new user and returns a JWT access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: uniqueEmail(), password: 'correct-password' })
        .expect(201);

      const body = response.body as Record<string, unknown>;
      expect(Object.keys(body)).toEqual(['accessToken']);
      expect(body.accessToken).toEqual(expect.stringMatching(JWT_PATTERN));
    });

    it('rejects registration when the email is already registered', async () => {
      const email = uniqueEmail();

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'correct-password' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'another-password' })
        .expect(409);
    });

    it('rejects registration with a missing email or password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ password: 'correct-password' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: uniqueEmail() })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    async function registerUser(email: string, password: string) {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password })
        .expect(201);
    }

    it('logs in an existing user and returns a JWT access token', async () => {
      const email = uniqueEmail();
      const password = 'correct-password';
      await registerUser(email, password);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(200);

      const body = response.body as Record<string, unknown>;
      expect(Object.keys(body)).toEqual(['accessToken']);
      expect(body.accessToken).toEqual(expect.stringMatching(JWT_PATTERN));
    });

    it('rejects login for an email with no matching user, without creating one', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: uniqueEmail(), password: 'correct-password' })
        .expect(401);
    });

    it('rejects login with an incorrect password for an existing user', async () => {
      const email = uniqueEmail();
      await registerUser(email, 'correct-password');

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'wrong-password' })
        .expect(401);
    });

    it('rejects login with a missing email or password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ password: 'correct-password' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: uniqueEmail() })
        .expect(400);
    });
  });
});
