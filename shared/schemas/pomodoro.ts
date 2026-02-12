import { z } from 'zod';

// 포모도로 세션 생성 스키마
export const CreatePomodoroSessionSchema = z.object({
  type: z.enum(['study', 'break']),
  duration_minutes: z
    .number()
    .min(1, '시간은 1분 이상이어야 합니다.')
    .max(1440, '시간은 1440분(24시간) 이하여야 합니다.'),
});
export type CreatePomodoroSessionInput = z.infer<typeof CreatePomodoroSessionSchema>;

// 포모도로 설정 업데이트 스키마
export const UpdatePomodoroSettingsSchema = z.object({
  study_duration: z
    .number()
    .min(1, '공부 시간은 1분 이상이어야 합니다.')
    .max(1440, '공부 시간은 1440분(24시간) 이하여야 합니다.'),
  break_duration: z
    .number()
    .min(1, '휴식 시간은 1분 이상이어야 합니다.')
    .max(1440, '휴식 시간은 1440분(24시간) 이하여야 합니다.'),
});
export type UpdatePomodoroSettingsInput = z.infer<typeof UpdatePomodoroSettingsSchema>;
