export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

export interface StorageDriver {
  upload(
    buffer: Buffer,
    key: string,
    mimeType: string,
  ): Promise<UploadResult>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}

export const STORAGE_DRIVER = 'STORAGE_DRIVER_TOKEN';
