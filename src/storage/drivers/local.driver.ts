import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { ConfigService } from '@nestjs/config';
import { StorageDriver, UploadResult } from '../storage.interface';

// Driver lưu file trên đĩa (dev). Được serve tĩnh qua /uploads (main.ts).
export class LocalDriver implements StorageDriver {
  private readonly root = join(process.cwd(), 'uploads');
  private readonly publicUrl: string;

  constructor(config: ConfigService) {
    this.publicUrl = (
      config.get<string>('STORAGE_PUBLIC_URL') ||
      'http://localhost:3000/uploads'
    ).replace(/\/$/, '');
  }

  async upload(
    buffer: Buffer,
    key: string,
    mimeType: string,
  ): Promise<UploadResult> {
    const filePath = join(this.root, key);
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
    return { url: this.getPublicUrl(key), key, size: buffer.length, mimeType };
  }

  async delete(key: string): Promise<void> {
    await fs.rm(join(this.root, key), { force: true });
  }

  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }
}
