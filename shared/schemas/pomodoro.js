"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePomodoroSettingsSchema = exports.CreatePomodoroSessionSchema = void 0;
const zod_1 = require("zod");
exports.CreatePomodoroSessionSchema = zod_1.z.object({
    type: zod_1.z.enum(['study', 'break']),
    duration_minutes: zod_1.z
        .number()
        .min(1, '시간은 1분 이상이어야 합니다.')
        .max(1440, '시간은 1440분(24시간) 이하여야 합니다.'),
});
exports.UpdatePomodoroSettingsSchema = zod_1.z.object({
    study_duration: zod_1.z
        .number()
        .min(1, '공부 시간은 1분 이상이어야 합니다.')
        .max(1440, '공부 시간은 1440분(24시간) 이하여야 합니다.'),
    break_duration: zod_1.z
        .number()
        .min(1, '휴식 시간은 1분 이상이어야 합니다.')
        .max(1440, '휴식 시간은 1440분(24시간) 이하여야 합니다.'),
});
//# sourceMappingURL=pomodoro.js.map