import { z } from 'zod';

// 그룹 생성 스키마
export const CreateGroupSchema = z.object({
  name: z.string().min(1, '그룹명은 필수입니다.').max(100, '그룹명은 100자 이하여야 합니다.'),
  description: z.string().max(500, '설명은 500자 이하여야 합니다.').optional(),
});
export type CreateGroupInput = z.infer<typeof CreateGroupSchema>;

// 그룹 수정 스키마
export const UpdateGroupSchema = z.object({
  name: z
    .string()
    .min(1, '그룹명은 필수입니다.')
    .max(100, '그룹명은 100자 이하여야 합니다.')
    .optional(),
  description: z.string().max(500, '설명은 500자 이하여야 합니다.').optional(),
});
export type UpdateGroupInput = z.infer<typeof UpdateGroupSchema>;

// 멤버 초대 스키마
export const InviteMemberSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력하세요.'),
});
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;

// 그룹 설정 변경 스키마
export const UpdateGroupSettingsSchema = z.object({
  chat_enabled: z.boolean().optional(),
  check_in_interval: z
    .number()
    .min(5, '체크인 간격은 최소 5분입니다.')
    .max(120, '체크인 간격은 최대 120분입니다.')
    .optional(),
  check_in_duration_seconds: z
    .number()
    .min(10, '체크인 노출 시간은 최소 10초입니다.')
    .max(300, '체크인 노출 시간은 최대 300초입니다.')
    .optional(),
});
export type UpdateGroupSettingsInput = z.infer<typeof UpdateGroupSettingsSchema>;
