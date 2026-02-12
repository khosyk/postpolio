// 포모도로 관련 타입 정의

export type PomodoroSessionType = 'study' | 'break';
export type PomodoroSessionStatus = 'active' | 'completed' | 'cancelled';

export interface PomodoroSession {
  id: string;
  user_id: string;
  type: PomodoroSessionType;
  duration_minutes: number;
  completed_at: string | null;
  status: PomodoroSessionStatus;
  created_at: string;
  updated_at: string;
}

export interface CreatePomodoroSessionRequest {
  type: PomodoroSessionType;
  duration_minutes: number;
}

export interface PomodoroSettings {
  study_duration: number; // 최대 1440분 (24시간)
  break_duration: number; // 최대 1440분 (24시간)
}

export interface UpdatePomodoroSettingsRequest {
  study_duration: number; // 최대 1440분 (24시간)
  break_duration: number; // 최대 1440분 (24시간)
}
