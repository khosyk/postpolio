import { z } from 'zod';

export const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  // 닉네임은 최대 8글자
  displayName: z.string().max(8, '닉네임은 최대 8자까지 가능합니다.').optional(),
  avatar: z.string().optional(),
});
export type SignUpInput = z.infer<typeof SignUpSchema>;

export const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type SignInInput = z.infer<typeof SignInSchema>;
