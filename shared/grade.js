"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateExamTemplateSchema = exports.CreateExamTemplateSchema = exports.ExamTemplateSubjectSchema = exports.UpdateGradeSchema = exports.CreateGradeSchema = exports.CreateExamSchema = void 0;
const zod_1 = require("zod");
// 시험 생성 스키마
exports.CreateExamSchema = zod_1.z.object({
    exam_name: zod_1.z.string().min(1, '시험명은 필수입니다.').max(50, '시험명은 50자 이하여야 합니다.'),
    exam_date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)'),
});
// 과목별 성적 생성 스키마 (max_score는 과목별로 설정)
exports.CreateGradeSchema = zod_1.z.object({
    exam_id: zod_1.z.string().min(1, '시험 ID는 필수입니다.'),
    subject_name: zod_1.z.string().min(1, '과목명은 필수입니다.').max(50, '과목명은 50자 이하여야 합니다.'),
    max_score: zod_1.z
        .number()
        .min(1, '최고 점수는 1 이상이어야 합니다.')
        .max(10000, '최고 점수는 10000 이하여야 합니다.')
        .default(100),
    target_score: zod_1.z.number().min(0, '목표 점수는 0 이상이어야 합니다.'),
    current_score: zod_1.z.number().min(0, '현재 점수는 0 이상이어야 합니다.').optional(),
});
// 성적표 수정 스키마
exports.UpdateGradeSchema = zod_1.z.object({
    current_score: zod_1.z.number().min(0, '현재 점수는 0 이상이어야 합니다.').optional(),
    target_score: zod_1.z.number().min(0, '목표 점수는 0 이상이어야 합니다.').optional(),
    max_score: zod_1.z
        .number()
        .min(1, '최고 점수는 1 이상이어야 합니다.')
        .max(10000, '최고 점수는 10000 이하여야 합니다.')
        .optional(),
});
// 시험 템플릿 스키마
exports.ExamTemplateSubjectSchema = zod_1.z.object({
    subject_name: zod_1.z.string().min(1, '과목명은 필수입니다.').max(50, '과목명은 50자 이하여야 합니다.'),
    max_score: zod_1.z
        .number()
        .min(1, '최고 점수는 1 이상이어야 합니다.')
        .max(10000, '최고 점수는 10000 이하여야 합니다.'),
});
exports.CreateExamTemplateSchema = zod_1.z.object({
    template_name: zod_1.z.string().min(1, '템플릿명은 필수입니다.').max(50, '템플릿명은 50자 이하여야 합니다.'),
    description: zod_1.z.string().max(200, '설명은 200자 이하여야 합니다.').optional(),
    subjects: zod_1.z.array(exports.ExamTemplateSubjectSchema).min(1, '최소 1개 이상의 과목이 필요합니다.'),
    is_active: zod_1.z.boolean().optional().default(true),
});
exports.UpdateExamTemplateSchema = exports.CreateExamTemplateSchema.partial();
