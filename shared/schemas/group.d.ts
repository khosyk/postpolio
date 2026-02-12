import { z } from 'zod';
export declare const CreateGroupSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateGroupInput = z.infer<typeof CreateGroupSchema>;
export declare const UpdateGroupSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type UpdateGroupInput = z.infer<typeof UpdateGroupSchema>;
export declare const InviteMemberSchema: z.ZodObject<{
    email: z.ZodString;
}, z.core.$strip>;
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;
export declare const UpdateGroupSettingsSchema: z.ZodObject<{
    chat_enabled: z.ZodOptional<z.ZodBoolean>;
    check_in_interval: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type UpdateGroupSettingsInput = z.infer<typeof UpdateGroupSettingsSchema>;
//# sourceMappingURL=group.d.ts.map