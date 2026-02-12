import { z } from 'zod';
export declare const CreatePomodoroSessionSchema: z.ZodObject<{
    type: z.ZodEnum<{
        study: "study";
        break: "break";
    }>;
    duration_minutes: z.ZodNumber;
}, z.core.$strip>;
export type CreatePomodoroSessionInput = z.infer<typeof CreatePomodoroSessionSchema>;
export declare const UpdatePomodoroSettingsSchema: z.ZodObject<{
    study_duration: z.ZodNumber;
    break_duration: z.ZodNumber;
}, z.core.$strip>;
export type UpdatePomodoroSettingsInput = z.infer<typeof UpdatePomodoroSettingsSchema>;
//# sourceMappingURL=pomodoro.d.ts.map