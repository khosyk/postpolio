// 공통 타입 정의
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

// 사용자 관련 타입
export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  user_id: string;
  email: string;
  nickname?: string;
  avatar?: string;
  created_at?: string;
  updated_at?: string;
}

// 인증 관련 타입
export interface SignUpRequest {
  email: string;
  password: string;
  displayName?: string;
  avatar?: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
  };
  profile: UserProfile;
  accessToken?: string;
  refreshToken?: string;
}

// 소켓 관련 타입
export interface SocketUser {
  userId: string;
  email: string;
  displayName: string;
  avatar: string;
}

export interface Message {
  id: string;
  text: string;
  userId: string;
  displayName?: string;
  avatar?: string;
  createdAt: string;
  type?: 'message' | 'system';
}

export interface SystemMessage {
  kind: 'join' | 'leave';
  userId: string;
  displayName?: string;
  avatar?: string;
  roomId: string;
}

export interface JoinedResponse {
  roomId: string;
  userId: string;
  displayName?: string;
  avatar?: string;
  history: Message[];
}

// 방 관련 타입
export interface Room {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// 환경 변수 타입
export interface Environment {
  PORT: string;
  CORS_ORIGIN: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

// Supabase Auth 응답 타입
export interface SupabaseAuthResponse {
  user: {
    id: string;
    email: string;
  };
  session?: {
    access_token: string;
    refresh_token: string;
  };
}

// API 에러 타입
export interface ApiError {
  message: string;
  status?: number;
}

// 스터디 그룹 관련 타입
export interface StudyGroup {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  chat_enabled: boolean;
  check_in_interval: number;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
}

export interface UpdateGroupSettingsRequest {
  chat_enabled?: boolean;
  check_in_interval?: number;
}

export interface InviteMemberRequest {
  email: string;
}

export interface GroupWithMembers extends StudyGroup {
  members?: GroupMember[];
  memberCount?: number;
}

// 공부 세션 관련 타입 (Phase 6)
export interface StudySession {
  id: string;
  group_id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  status: 'active' | 'paused' | 'ended';
  total_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface CheckInRecord {
  id: string;
  session_id: string;
  user_id: string;
  group_id: string;
  checked_at: string;
  is_valid: boolean;
  created_at: string;
}

export interface RankingEntry {
  userId: string;
  displayName: string;
  avatar: string;
  totalMinutes: number;
  rank: number;
}

export interface CheckInRequest {
  groupId: string;
  sessionId: string;
  userId: string;
}

// 통계 관련 타입
export interface DailyStat {
  date: string; // YYYY-MM-DD
  totalMinutes: number;
}

export interface WeeklyStat {
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  totalMinutes: number;
  dailyStats: DailyStat[];
}

export interface MonthlyStat {
  year: number;
  month: number;
  totalMinutes: number;
  dailyStats: DailyStat[];
}

export interface SummaryStat {
  totalDays: number;
  totalMinutes: number;
  averageMinutes: number;
  maxDailyMinutes: number;
}

// 성적표 관련 타입 (Phase 7)
export interface Exam {
  id: string;
  user_id: string;
  exam_name: string;
  exam_date: string;
  created_at: string;
  updated_at: string;
}

export interface GradeRecord {
  id: string;
  user_id: string;
  exam_id: string;
  subject_name: string;
  max_score: number;
  target_score: number;
  current_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateExamRequest {
  exam_name: string;
  exam_date: string;
}

export interface ExamWithGrades extends Exam {
  grades: GradeRecord[];
}

export interface CreateGradeRequest {
  exam_id: string;
  subject_name: string;
  max_score: number;
  target_score: number;
  current_score?: number;
}

export interface UpdateGradeRequest {
  subject_name?: string;
  current_score?: number;
  target_score?: number;
  max_score?: number;
}

// 시험 템플릿 관련 타입
export interface ExamTemplateSubject {
  subject_name: string;
  max_score: number;
}

export interface ExamTemplate {
  id: string;
  template_name: string;
  description: string | null;
  subjects: ExamTemplateSubject[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateExamTemplateRequest {
  template_name: string;
  description?: string;
  subjects: ExamTemplateSubject[];
  is_active?: boolean;
}

export interface UpdateExamTemplateRequest {
  template_name?: string;
  description?: string;
  subjects?: ExamTemplateSubject[];
  is_active?: boolean;
}

// 포모도로 관련 타입 (Phase 8)
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
