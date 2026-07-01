import {
  BadRequestException,
  Controller,
  Delete,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Role } from '@prisma/client';
import { StorageService } from '../storage/storage.service';
import { ResponseMessage, Roles } from '../decorator/customize';

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const AUDIO_MIMES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/ogg',
];
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/mp4': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/m4a': '.m4a',
  'audio/ogg': '.ogg',
};

@ApiTags('Files')
@ApiBearerAuth('token')
@Roles(Role.ADMIN, Role.TEACHER)
@Controller('files')
export class FilesController {
  constructor(
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload ảnh/audio, trả về URL công khai' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'folder_type',
    required: false,
    enum: ['images', 'audio'],
    description: 'Phân loại thư mục gốc (mặc định images)',
  })
  @ApiQuery({
    name: 'prefix',
    required: false,
    description:
      'Thư mục con tuỳ chọn để dễ nhận biết, vd "reading/p5" hoặc "listening-p2". Tối đa 3 cấp.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ResponseMessage('Upload thành công')
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder_type') folderType = 'images',
    @Query('prefix') prefix?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Chưa chọn file (field "file")');
    }
    const folder = folderType === 'audio' ? 'audio' : 'images';
    this.validate(file, folder);

    const ext =
      extname(file.originalname).toLowerCase() ||
      EXT_BY_MIME[file.mimetype] ||
      '';
    const sub = this.sanitizePrefix(prefix);
    const key = `${folder}/${sub ? sub + '/' : ''}${uuidv4()}${ext}`;
    return this.storage.upload(file.buffer, key, file.mimetype);
  }

  @Delete()
  @ApiOperation({ summary: 'Xóa file khỏi storage theo key hoặc url' })
  @ApiQuery({
    name: 'key',
    required: false,
    description: 'Key file, vd images/reading/p5/abc.jpg',
  })
  @ApiQuery({
    name: 'url',
    required: false,
    description: 'Hoặc dán nguyên URL công khai, backend tự tách key',
  })
  @ResponseMessage('Xóa file thành công')
  async remove(@Query('key') key?: string, @Query('url') url?: string) {
    const k = key || this.keyFromUrl(url);
    if (!k) {
      throw new BadRequestException('Cần truyền key hoặc url của file');
    }
    await this.storage.delete(k);
    return { key: k };
  }

  // Tách key từ URL công khai (bỏ phần STORAGE_PUBLIC_URL).
  private keyFromUrl(url?: string): string {
    if (!url) return '';
    const base = (
      this.config.get<string>('STORAGE_PUBLIC_URL') || ''
    ).replace(/\/$/, '');
    return base && url.startsWith(base) ? url.slice(base.length + 1) : '';
  }

  // Chuẩn hoá prefix: chỉ cho a-z0-9-_/, tối đa 3 cấp, tránh ký tự lạ / path traversal.
  private sanitizePrefix(prefix?: string): string {
    if (!prefix) return '';
    return prefix
      .toLowerCase()
      .replace(/[^a-z0-9/_-]/g, '-')
      .replace(/\/+/g, '/')
      .replace(/^\/|\/$/g, '')
      .split('/')
      .filter(Boolean)
      .slice(0, 3)
      .join('/');
  }

  private validate(file: Express.Multer.File, folder: 'images' | 'audio') {
    const maxImage =
      Number(this.config.get('UPLOAD_MAX_IMAGE_MB') || 5) * 1024 * 1024;
    const maxAudio =
      Number(this.config.get('UPLOAD_MAX_AUDIO_MB') || 20) * 1024 * 1024;

    if (folder === 'images') {
      if (!IMAGE_MIMES.includes(file.mimetype)) {
        throw new BadRequestException(
          'Chỉ chấp nhận ảnh: jpeg, png, gif, webp',
        );
      }
      if (file.size > maxImage) {
        throw new BadRequestException(
          `Ảnh vượt quá dung lượng tối đa ${maxImage / 1024 / 1024}MB`,
        );
      }
    } else {
      if (!AUDIO_MIMES.includes(file.mimetype)) {
        throw new BadRequestException(
          'Chỉ chấp nhận audio: mp3, wav, m4a, ogg',
        );
      }
      if (file.size > maxAudio) {
        throw new BadRequestException(
          `Audio vượt quá dung lượng tối đa ${maxAudio / 1024 / 1024}MB`,
        );
      }
    }
  }
}
