import { z } from 'zod';

// 그룹 생성 스키마
export const CreateGroupSchema = z.object({
  name: z.string().min(1, '그룹명은 필수입니다.').max(100, '그룹명은 100자 이하여야 합니다.'),
  description: z.string().max(500, '설명은 500자 이하여야 합니다.').optional(),
});
export type CreateGroupInput = z.infer<typeof CreateGroupSchema>;

// 멤버 초대 스키마
export const InviteMemberSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력하세요.'),
});
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;
