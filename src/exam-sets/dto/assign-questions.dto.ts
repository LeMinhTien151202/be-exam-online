import { ArrayNotEmpty, IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AssignQuestionItemDto {
  @ApiProperty({ example: 1 })
  @IsInt({ message: 'questionId phải là số nguyên' })
  @Min(1)
  questionId: number;

  @ApiProperty({ example: 0, description: 'Thứ tự hiển thị trong part' })
  @IsInt({ message: 'orderIndex phải là số nguyên' })
  @Min(0)
  orderIndex: number;
}

export class AssignQuestionsDto {
  @ApiProperty({ type: [AssignQuestionItemDto] })
  @IsArray()
  @ArrayNotEmpty({ message: 'Danh sách câu hỏi không được rỗng' })
  @ValidateNested({ each: true })
  @Type(() => AssignQuestionItemDto)
  questions: AssignQuestionItemDto[];
}

export class ReorderQuestionsDto {
  @ApiProperty({ type: [AssignQuestionItemDto], description: 'Toàn bộ câu hỏi của part với orderIndex mới' })
  @IsArray()
  @ArrayNotEmpty({ message: 'Danh sách câu hỏi không được rỗng' })
  @ValidateNested({ each: true })
  @Type(() => AssignQuestionItemDto)
  questions: AssignQuestionItemDto[];
}
