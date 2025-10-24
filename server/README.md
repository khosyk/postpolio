# PostPolio Chat Server

## 프로젝트 구조

```
server/
├── src/
│   ├── index.js              # 메인 서버 파일 (Socket.IO + Express)
│   ├── supabaseClient.js     # Supabase 클라이언트 설정
│   ├── routes/
│   │   └── authRoutes.js     # 인증 관련 API 라우트
│   ├── services/
│   │   └── authService.js    # 인증 비즈니스 로직
│   ├── repositories/
│   │   └── userRepository.js # 사용자 데이터 액세스
│   └── middleware/
│       └── authMiddleware.js # 인증 미들웨어
├── package.json
└── .env                      # 환경 변수
```

## API 엔드포인트

### 인증 (Authentication)

#### POST `/api/auth/signup`

이메일 회원가입

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "사용자명",
  "avatar": "😀"
}
```

**Response:**

```json
{
  "success": true,
  "message": "회원가입이 완료되었습니다.",
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com"
    },
    "profile": {
      "user_id": "user-uuid",
      "email": "user@example.com",
      "display_name": "사용자명",
      "avatar": "😀"
    }
  }
}
```

#### POST `/api/auth/signin`

이메일 로그인

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "로그인되었습니다.",
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com"
    },
    "profile": {
      "user_id": "user-uuid",
      "email": "user@example.com",
      "display_name": "사용자명",
      "avatar": "😀"
    },
    "accessToken": "jwt-token"
  }
}
```

#### POST `/api/auth/verify`

토큰 검증

**Request Body:**

```json
{
  "token": "jwt-token"
}
```

#### PUT `/api/auth/profile`

프로필 업데이트

**Request Body:**

```json
{
  "userId": "user-uuid",
  "displayName": "새로운 사용자명",
  "avatar": "😎"
}
```

## Socket.IO 이벤트

### 클라이언트 → 서버

- `join` - 방 참여
- `message` - 메시지 전송
- `leave` - 방 나가기
- `clearHistory` - 채팅 기록 삭제

### 서버 → 클라이언트

- `joined` - 방 참여 확인
- `message` - 메시지 수신
- `system` - 시스템 알림 (입장/퇴장)
- `historyCleared` - 기록 삭제 알림

## 환경 변수

```env
PORT=4000
CORS_ORIGIN=*
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key
```

## 실행 방법

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 서버 실행
npm start
```

## 데이터베이스 스키마

### user_profiles 테이블

```sql
CREATE TABLE user_profiles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
