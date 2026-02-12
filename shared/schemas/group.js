"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateGroupSettingsSchema = exports.InviteMemberSchema = exports.UpdateGroupSchema = exports.CreateGroupSchema = void 0;
const zod_1 = require("zod");
exports.CreateGroupSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, '그룹명은 필수입니다.').max(100, '그룹명은 100자 이하여야 합니다.'),
    description: zod_1.z.string().max(500, '설명은 500자 이하여야 합니다.').optional(),
});
exports.UpdateGroupSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(1, '그룹명은 필수입니다.')
        .max(100, '그룹명은 100자 이하여야 합니다.')
        .optional(),
    description: zod_1.z.string().max(500, '설명은 500자 이하여야 합니다.').optional(),
});
exports.InviteMemberSchema = zod_1.z.object({
    email: zod_1.z.string().email('유효한 이메일 주소를 입력하세요.'),
});
exports.UpdateGroupSettingsSchema = zod_1.z.object({
    chat_enabled: zod_1.z.boolean().optional(),
    check_in_interval: zod_1.z
        .number()
        .min(5, '체크인 간격은 최소 5분입니다.')
        .max(120, '체크인 간격은 최대 120분입니다.')
        .optional(),
});
//# sourceMappingURL=group.js.map