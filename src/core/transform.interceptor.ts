import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE } from '../decorator/customize';

export interface Response<T> {
  code: number;
  success: boolean;
  message: string;
  messages: string[];
  data: any;
  metaData: any;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((rawOutput) => {
        const response = context.switchToHttp().getResponse();
        const customMessage = this.reflector.get<string>(RESPONSE_MESSAGE, context.getHandler()) || 'Thành công';

        // Kiểm tra xem dữ liệu thô trả về từ Service/Controller có chứa cấu trúc phân trang hay không
        const isPaginated = rawOutput && 'result' in rawOutput && 'page' in rawOutput;

        return {
          code: response.statusCode,
          success: response.statusCode >= 200 && response.statusCode < 300,
          message: customMessage,
          messages: [],
          data: isPaginated ? rawOutput.result : rawOutput,
          metaData: isPaginated
            ? {
                page: rawOutput.page,
                pageSize: rawOutput.pageSize,
                total: rawOutput.total,
                totalPage: rawOutput.totalPage,
              }
            : null,
        };
      }),
    );
  }
}
