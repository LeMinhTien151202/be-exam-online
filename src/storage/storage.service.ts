import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageDriver, UploadResult } from './storage.interface';
import { S3Driver } from './drivers/s3.driver';
import { LocalDriver } from './drivers/local.driver';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: StorageDriver;

  constructor(config: ConfigService) {
    const driverName = config.get<string>('STORAGE_DRIVER') || 'local';
    this.driver =
      driverName === 's3' ? new S3Driver(config) : new LocalDriver(config);
    this.logger.log(`Storage driver: ${driverName}`);
  }

  upload(buffer: Buffer, key: string, mimeType: string): Promise<UploadResult> {
    return this.driver.upload(buffer, key, mimeType);
  }

  delete(key: string): Promise<void> {
    return this.driver.delete(key);
  }

  getPublicUrl(key: string): string {
    return this.driver.getPublicUrl(key);
  }
}
