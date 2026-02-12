import { z } from 'zod';

// 시험 생성 스키마
export const CreateExamSchema = z.object({
  exam_name: z.string().min(1, '시험명은 필수입니다.').max(50, '시험명은 50자 이하여야 합니다.'),
  exam_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)'),
});
export type CreateExamInput = z.infer<typeof CreateExamSchema>;

// 과목별 성적 생성 스키마
// - current_score: 내가 이번 시험에 실제로 받은 점수
// - max_score: 시험에서 받을 수 있는 최대 점수(만점)
// - target_score: 내가 세운 목표 점수
export const CreateGradeSchema = z.object({
  exam_id: z.string().min(1, '시험 ID는 필수입니다.'),
  subject_name: z.string().min(1, '과목명은 필수입니다.').max(50, '과목명은 50자 이하여야 합니다.'),
  max_score: z
    .number()
    .min(1, '최고 점수는 1 이상이어야 합니다.')
    .max(1000, '최고 점수는 1000 이하여야 합니다.') // 만점 상한
    .default(100),
  target_score: z
    .number()
    .min(0, '목표 점수는 0 이상이어야 합니다.')
    .max(1000, '목표 점수는 1000 이하여야 합니다.'), // 목표 점수 상한 (만점과 동일하게 1000)
  current_score: z.number().min(0, '현재 점수는 0 이상이어야 합니다.').optional(),
});
export type CreateGradeInput = z.infer<typeof CreateGradeSchema>;

// 성적표 수정 스키마
export const UpdateGradeSchema = z.object({
  subject_name: z.string().min(1, '과목명은 필수입니다.').max(50, '과목명은 50자 이하여야 합니다.').optional(),
  current_score: z.number().min(0, '현재 점수는 0 이상이어야 합니다.').optional(),
  target_score: z
    .number()
    .min(0, '목표 점수는 0 이상이어야 합니다.')
    .max(1000, '목표 점수는 1000 이하여야 합니다.')
    .optional(),
  max_score: z
    .number()
    .min(1, '최고 점수는 1 이상이어야 합니다.')
    .max(1000, '최고 점수는 1000 이하여야 합니다.')
    .optional(),
});
export type UpdateGradeInput = z.infer<typeof UpdateGradeSchema>;

// 시험 템플릿 스키마
export const ExamTemplateSubjectSchema = z.object({
  subject_name: z.string().min(1, '과목명은 필수입니다.').max(50, '과목명은 50자 이하여야 합니다.'),
  max_score: z
    .number()
    .min(1, '최고 점수는 1 이상이어야 합니다.')
    .max(10000, '최고 점수는 10000 이하여야 합니다.'),
});

export const CreateExamTemplateSchema = z.object({
  template_name: z.string().min(1, '템플릿명은 필수입니다.').max(50, '템플릿명은 50자 이하여야 합니다.'),
  description: z.string().max(200, '설명은 200자 이하여야 합니다.').optional(),
  subjects: z.array(ExamTemplateSubjectSchema).min(1, '최소 1개 이상의 과목이 필요합니다.'),
  is_active: z.boolean().optional().default(true),
});
export type CreateExamTemplateInput = z.infer<typeof CreateExamTemplateSchema>;

export const UpdateExamTemplateSchema = CreateExamTemplateSchema.partial();
export type UpdateExamTemplateInput = z.infer<typeof UpdateExamTemplateSchema>;
