import type { Server } from 'http';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Node's default requestTimeout (~5 min) is too short for the 2 GiB
  // meeting recording upload on a slow connection (see
  // docs/research-meeting-upload.md §3). headersTimeout stays close to
  // Node's default — only the body transfer needs the long timeout.
  const httpServer = app.getHttpServer() as Server;
  httpServer.requestTimeout = 30 * 60 * 1000;
  httpServer.headersTimeout = 65 * 1000;

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
