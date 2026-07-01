import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { StorageDriver, UploadResult } from '../storage.interface';

// Driver S3-compatible: chạy cho Cloudflare R2, MinIO, Backblaze B2, Wasabi, DO Spaces, AWS S3.
export class S3Driver implements StorageDriver {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>('S3_BUCKET') as string;
    this.publicUrl = (config.get<string>('STORAGE_PUBLIC_URL') || '').replace(
      /\/$/,
      '',
    );
    this.client = new S3Client({
      region: config.get<string>('S3_REGION') || 'auto',
      endpoint: config.get<string>('S3_ENDPOINT'),
      forcePathStyle: config.get<string>('S3_FORCE_PATH_STYLE') === 'true',
      credentials: {
        accessKeyId: config.get<string>('S3_ACCESS_KEY_ID') as string,
        secretAccessKey: config.get<string>('S3_SECRET_ACCESS_KEY') as string,
      },
    });
  }

  async upload(
    buffer: Buffer,
    key: string,
    mimeType: string,
  ): Promise<UploadResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
    return {
      url: this.getPublicUrl(key),
      key,
      size: buffer.length,
      mimeType,
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }
}
