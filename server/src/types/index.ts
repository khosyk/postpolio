// 공통 타입 정의
export interface ApiResponse<T = any> {
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
  display_name?: string;
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
