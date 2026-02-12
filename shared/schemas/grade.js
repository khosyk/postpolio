"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateGradeSchema = exports.CreateGradeSchema = exports.CreateExamSchema = void 0;
const zod_1 = require("zod");
exports.CreateExamSchema = zod_1.z.object({
    exam_name: zod_1.z.string().min(1, '시험명은 필수입니다.').max(50, '시험명은 50자 이하여야 합니다.'),
    exam_date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)'),
    max_score: zod_1.z
        .number()
        .min(1, '최고 점수는 1 이상이어야 합니다.')
        .max(10000, '최고 점수는 10000 이하여야 합니다.')
        .default(100),
});
exports.CreateGradeSchema = zod_1.z.object({
    exam_id: zod_1.z.string().min(1, '시험 ID는 필수입니다.'),
    subject_name: zod_1.z.string().min(1, '과목명은 필수입니다.').max(50, '과목명은 50자 이하여야 합니다.'),
    max_score: zod_1.z
        .number()
        .min(1, '최고 점수는 1 이상이어야 합니다.')
        .max(1000, '최고 점수는 1000 이하여야 합니다.')
        .default(100),
    target_score: zod_1.z
        .number()
        .min(0, '목표 점수는 0 이상이어야 합니다.')
        .max(1000, '목표 점수는 1000 이하여야 합니다.'),
    current_score: zod_1.z.number().min(0, '현재 점수는 0 이상이어야 합니다.').optional(),
});
exports.UpdateGradeSchema = zod_1.z.object({
    subject_name: zod_1.z
        .string()
        .min(1, '과목명은 필수입니다.')
        .max(50, '과목명은 50자 이하여야 합니다.')
        .optional(),
    current_score: zod_1.z.number().min(0, '현재 점수는 0 이상이어야 합니다.').optional(),
    target_score: zod_1.z
        .number()
        .min(0, '목표 점수는 0 이상이어야 합니다.')
        .max(1000, '목표 점수는 1000 이하여야 합니다.')
        .optional(),
    max_score: zod_1.z
        .number()
        .min(1, '최고 점수는 1 이상이어야 합니다.')
        .max(1000, '최고 점수는 1000 이하여야 합니다.')
        .optional(),
});
//# sourceMappingURL=grade.js.map