import { z } from 'zod';
export declare const CreateExamSchema: z.ZodObject<{
    exam_name: z.ZodString;
    exam_date: z.ZodString;
    max_score: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type CreateExamInput = z.infer<typeof CreateExamSchema>;
export declare const CreateGradeSchema: z.ZodObject<{
    exam_id: z.ZodString;
    subject_name: z.ZodString;
    target_score: z.ZodNumber;
    current_score: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type CreateGradeInput = z.infer<typeof CreateGradeSchema>;
export declare const UpdateGradeSchema: z.ZodObject<{
    current_score: z.ZodOptional<z.ZodNumber>;
    target_score: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type UpdateGradeInput = z.infer<typeof UpdateGradeSchema>;
//# sourceMappingURL=grade.d.ts.map