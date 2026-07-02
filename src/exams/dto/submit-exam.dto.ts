import { Allow, ArrayNotEmpty, IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitAnswerDto {
  @ApiProperty({ example: 10, description: 'ID câu hỏi trong đề' })
  @IsInt({ message: 'questionId phải là số nguyên' })
  @Min(1)
  questionId: number;

  @ApiProperty({
    description:
      'Đáp án học viên (shape tuỳ dạng): MC=index số; gap-fill=[index...]; ORDERING=[thứ tự]; WORD_BANK={slot_id:answer}; HEADING_MATCH={paragraph_label:heading}; SPEAKER_MATCH Listening={speaker_index:answer} / Reading=[person...]; ESSAY=text; RECORD=url audio',
  })
  @Allow()
  response: unknown;
}

export class SubmitExamDto {
  @ApiProperty({ type: [SubmitAnswerDto] })
  @IsArray()
  @ArrayNotEmpty({ message: 'answers không được rỗng' })
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  answers: SubmitAnswerDto[];
}
