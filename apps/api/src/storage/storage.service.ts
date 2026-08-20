import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';

// Config resolution is lazy (on first upload()) rather than in the
// constructor: StorageModule is imported by MeetingsModule, which is
// imported by AppModule, so every app bootstrap — including e2e specs
// for routes that never touch storage — would otherwise hard-require
// STORAGE_* env vars just to instantiate the DI graph.
@Injectable()
export class StorageService implements OnModuleDestroy {
  private client?: S3Client;
  private bucket?: string;

  constructor(private readonly config: ConfigService) {}

  private getClient(): { client: S3Client; bucket: string } {
    if (!this.client || !this.bucket) {
      this.bucket = this.config.getOrThrow<string>('STORAGE_BUCKET');
      this.client = new S3Client({
        endpoint: this.config.getOrThrow<string>('STORAGE_ENDPOINT'),
        region: this.config.getOrThrow<string>('STORAGE_REGION'),
        forcePathStyle:
          this.config.getOrThrow<string>('STORAGE_FORCE_PATH_STYLE') === 'true',
        credentials: {
          accessKeyId: this.config.getOrThrow<string>('STORAGE_ACCESS_KEY_ID'),
          secretAccessKey: this.config.getOrThrow<string>(
            'STORAGE_SECRET_ACCESS_KEY',
          ),
        },
      });
    }
    return { client: this.client, bucket: this.bucket };
  }

  async upload(
    key: string,
    body: Readable,
    contentType: string,
  ): Promise<void> {
    const { client, bucket } = this.getClient();
    const upload = new Upload({
      client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      },
    });
    await upload.done();
  }

  onModuleDestroy(): void {
    this.client?.destroy();
  }
}
