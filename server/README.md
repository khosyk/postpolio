# 딥웰스터디 서버 (Deep Well Study Server)

Node.js + Express + Socket.IO 기반 백엔드 서버입니다.

## 📑 목차

1. [기술 스택](#-기술-스택)
2. [프로젝트 구조](#-프로젝트-구조)
3. [설치 및 실행](#️-설치-및-실행)
4. [API 엔드포인트](#-api-엔드포인트)
5. [Socket.IO 이벤트](#-socketio-이벤트)
6. [보안](#-보안)
7. [데이터베이스](#-데이터베이스)
8. [아키텍처 패턴](#️-아키텍처-패턴)
9. [로깅](#-로깅)
10. [개발 도구](#-개발-도구)
11. [에러 처리](#-에러-처리)
12. [보안 베스트 프랙티스](#-보안-베스트-프랙티스)
13. [개발 워크플로우](#개발-워크플로우)

## 🚀 기술 스택

- **Node.js** 18+
- **Express.js** 5.x - REST API 서버
- **Socket.IO** 4.x - 실시간 WebSocket 통신
- **TypeScript** - 타입 안전성
- **Supabase** - 인증 및 데이터베이스
- **Zod** - 스키마 검증
- **Winston** - 로깅
- **Helmet** - 보안 헤더
- **express-rate-limit** - 요청 제한

## 📁 프로젝트 구조

```
server/
├── src/
│   ├── index.ts                  # 메인 서버 파일
│   ├── config/
│   │   └── env.ts                # 환경 변수 설정
│   ├── routes/                   # API 라우트
│   │   ├── authRoutes.ts         # 인증 API
│   │   ├── groupRoutes.ts        # 그룹 관리 API
│   │   ├── messageRoutes.ts      # 메시지 API
│   │   ├── gradeRoutes.ts        # 성적표 API
│   │   ├── pomodoroRoutes.ts     # 포모도로 API
│   │   ├── statsRoutes.ts        # 통계 API
│   │   └── healthRoutes.ts       # 헬스체크
│   ├── services/                 # 비즈니스 로직
│   │   ├── authService.ts
│   │   ├── groupService.ts
│   │   ├── messageService.ts
│   │   ├── studyService.ts       
│   │   ├── gradeService.ts
│   │   ├── pomodoroService.ts
│   │   └── statsService.ts
│   ├── repositories/             # 데이터 접근 계층
│   │   ├── userRepository.ts
│   │   ├── groupRepository.ts
│   │   ├── messageRepository.ts
│   │   ├── studyRepository.ts
│   │   ├── gradeRepository.ts
│   │   ├── pomodoroRepository.ts
│   │   └── statsRepository.ts
│   ├── socket/                   # Socket.IO 핸들러
│   │   └── socketHandler.ts
│   ├── middleware/               # Express 미들웨어
│   │   ├── authMiddleware.ts     # 인증 미들웨어
│   │   ├── errorHandler.ts       # 에러 핸들러
│   │   ├── rateLimiter.ts        # 요청 제한
│   │   ├── security.ts           # 보안 헤더
│   │   └── requestLogger.ts      # 요청 로깅
│   ├── types/                    # TypeScript 타입
│   │   ├── index.ts
│   │   └── socket.ts
│   └── utils/                    # 유틸리티
│       ├── logger.ts
│       ├── error.ts
│       └── response.ts
├── dist/                         # 빌드 결과물
├── package.json
└── tsconfig.json
```

## 🛠️ 설치 및 실행

### 1. 의존성 설치

```bash
cd server
yarn install
```

### 2. 환경 변수 설정

`server/.env` 파일 생성:

```env
NODE_ENV=development
PORT=4000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
CORS_ORIGIN=*
LOG_LEVEL=info
```

### 3. 개발 서버 실행

```bash
# 개발 모드 (자동 재시작)
yarn dev

# 또는 watch 모드
yarn dev:watch

# 프로덕션 빌드
yarn build
yarn start
```

## 📡 API 엔드포인트

### 인증 API (`/api/auth`)

#### POST `/api/auth/signup`
회원가입

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "사용자명",
  "avatar": "👤"
}
```

**Response:**
```json
{
  "success": true,
  "message": "회원가입이 완료되었습니다.",
  "data": {
    "user": { "id": "uuid", "email": "user@example.com" },
    "profile": { "user_id": "uuid", "display_name": "사용자명" },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

#### POST `/api/auth/signin`
로그인

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### POST `/api/auth/verify`
토큰 검증

#### PUT `/api/auth/profile`
프로필 업데이트

### 그룹 관리 API (`/api/groups`)

#### POST `/api/groups`
그룹 생성

#### GET `/api/groups`
내 그룹 목록 조회

#### GET `/api/groups/:id`
그룹 상세 조회

#### PUT `/api/groups/:id/settings`
그룹 설정 변경 (채팅 허용/금지, 체크인 간격)

#### POST `/api/groups/:id/invite`
멤버 초대

#### DELETE `/api/groups/:id/members/:userId`
멤버 제거

#### DELETE `/api/groups/:id`
그룹 삭제

### 메시지 API (`/api/messages`)

#### POST `/api/messages`
메시지 전송

#### GET `/api/messages/:groupId`
그룹 메시지 히스토리 조회

### 성적표 API (`/api/grades`)

#### POST `/api/grades/exams`
시험 생성

#### GET `/api/grades/exams`
내 시험 목록 조회

#### GET `/api/grades/exams/:examId`
시험 상세 조회

#### PUT `/api/grades/exams/:examId`
시험 수정

#### DELETE `/api/grades/exams/:examId`
시험 삭제

#### POST `/api/grades`
과목 추가

#### PUT `/api/grades/:id`
과목 수정

#### DELETE `/api/grades/:id`
과목 삭제

#### GET `/api/grades/templates`
시험 템플릿 목록 조회

### 포모도로 API (`/api/pomodoro`)

#### POST `/api/pomodoro/sessions`
세션 시작

#### PUT `/api/pomodoro/sessions/:id/complete`
세션 완료

#### PUT `/api/pomodoro/sessions/:id/cancel`
세션 취소

#### GET `/api/pomodoro/sessions`
세션 목록 조회

#### GET `/api/pomodoro/settings`
설정 조회

#### PUT `/api/pomodoro/settings`
설정 변경

### 통계 API (`/api/stats`)

#### GET `/api/stats/daily?startDate=&endDate=`
일별 통계 조회

#### GET `/api/stats/weekly?week=`
주간 통계 조회

#### GET `/api/stats/monthly?year=&month=`
월별 통계 조회

#### GET `/api/stats/summary`
전체 요약 통계

## 🔌 Socket.IO 이벤트

### 클라이언트 → 서버

#### `join`
그룹 채팅방 입장

```typescript
socket.emit('join', groupId);
```

#### `message`
메시지 전송

```typescript
socket.emit('message', { roomId: groupId, text: '메시지 내용' });
```

#### `leave`
채팅방 나가기

```typescript
socket.emit('leave', groupId);
```

#### `study:start`
공부 세션 시작

```typescript
socket.emit('study:start', { groupId });
```

#### `study:stop`
공부 세션 종료

```typescript
socket.emit('study:stop', { groupId });
```

#### `study:checkin:request`
체크인 요청 (방장만 가능)

```typescript
socket.emit('study:checkin:request', { groupId });
```

#### `study:checkin:submit`
체크인 제출

```typescript
socket.emit('study:checkin:submit', { groupId, sessionId });
```

#### `study:status`
공부 상태 조회

```typescript
socket.emit('study:status', { groupId });
```

### 서버 → 클라이언트

#### `joined`
채팅방 입장 완료

```typescript
{
  roomId: string;
  userId: string;
  displayName: string;
  avatar: string;
  history: Message[];
}
```

#### `message`
메시지 수신

```typescript
{
  id: string;
  text: string;
  userId: string;
  displayName: string;
  avatar: string;
  createdAt: string;
  type: 'message' | 'system';
}
```

#### `system`
시스템 메시지 (입장/퇴장)

```typescript
{
  kind: 'join' | 'leave';
  userId: string;
  displayName?: string;
  avatar?: string;
  roomId: string;
}
```

#### `study:checkin:request`
체크인 요청 알림

```typescript
{
  groupId: string;
  checkInInterval: number;
  activeSessions: string[];
}
```

#### `study:checkin:complete`
체크인 완료 알림

```typescript
{
  groupId: string;
  userId: string;
  sessionId: string;
  isValid: boolean;
}
```

#### `study:ranking:update`
랭킹 업데이트

```typescript
{
  groupId: string;
  ranking: Array<{
    userId: string;
    displayName: string;
    avatar: string;
    totalMinutes: number;
    rank: number;
  }>;
}
```

#### `study:time:update`
공부 시간 업데이트

```typescript
{
  groupId: string;
  userId: string;
  totalMinutes: number;
}
```

#### `error`
에러 발생

```typescript
{
  message: string;
}
```

## 🔒 보안

### 인증
- 모든 API 엔드포인트는 `authMiddleware` 적용 필요
- JWT 토큰 기반 인증
- Socket.IO 연결 시 토큰 검증

### 요청 제한
- 일반 API: 100 requests/15분
- 인증 API: 5 requests/15분
- 헬스체크: 제한 없음

### 보안 헤더
- Helmet.js로 보안 헤더 자동 설정
- CORS 설정
- 요청 크기 제한 (10MB)

### 입력 검증
- 모든 입력값은 Zod 스키마로 검증
- SQL Injection 방지 (Supabase 사용)
- XSS 방지

## 📊 데이터베이스

### Supabase 설정

#### 환경 변수

`server/.env` 파일에 다음 변수들을 설정하세요:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
PORT=4000
CORS_ORIGIN=*
```

#### 데이터베이스 초기화

1. Supabase Dashboard → SQL Editor 접속
2. `.secure/database/migrations/SUPABASE_COMPLETE_SETUP.sql` 파일 내용 복사
3. SQL Editor에서 실행

**주의**: SQL 마이그레이션 파일은 `.secure/database/migrations/` 폴더에 보관되어 있습니다. 보안을 위해 공개 저장소에 커밋하지 마세요.

### 테이블 구조 및 관계

#### 사용자 및 그룹

- **user_profiles**: 사용자 프로필
  - `user_id` (PK, FK → auth.users)
  - `email`, `display_name`, `avatar`
  
- **study_groups**: 스터디 그룹
  - `id` (PK)
  - `owner_id` (FK → user_profiles)
  - `chat_enabled`: 채팅 허용 여부
  - `check_in_interval`: 체크인 간격 (분)
  
- **group_members**: 그룹 멤버 관계
  - `group_id` (FK → study_groups)
  - `user_id` (FK → user_profiles)
  - Composite PK: (group_id, user_id)

#### 채팅 및 공부 세션

- **group_messages**: 채팅 메시지
  - `id` (PK)
  - `group_id` (FK → study_groups)
  - `user_id` (FK → user_profiles)
  - `text`, `created_at`

- **study_sessions**: 공부 세션
  - `id` (PK)
  - `group_id` (FK → study_groups)
  - `user_id` (FK → user_profiles)
  - `started_at`, `ended_at`, `status`

- **check_in_records**: 체크인 기록
  - `id` (PK)
  - `session_id` (FK → study_sessions)
  - `user_id` (FK → user_profiles)
  - `checked_at`, `is_valid`

#### 성적표

- **exams**: 시험 정보
  - `id` (PK)
  - `user_id` (FK → user_profiles)
  - `exam_name`, `exam_date`
  - `max_score`: 최고 점수 (기본값: 100)

- **grade_records**: 성적 기록
  - `id` (PK)
  - `exam_id` (FK → exams)
  - `user_id` (FK → user_profiles)
  - `subject_name`, `target_score`, `current_score`

- **exam_templates**: 시험 템플릿
  - `id` (PK)
  - `name`, `subjects` (JSON)

#### 포모도로

- **pomodoro_sessions**: 포모도로 세션
  - `id` (PK)
  - `user_id` (FK → user_profiles)
  - `type`: 'study' | 'break'
  - `duration_minutes`, `completed_at`, `status`

- **pomodoro_settings**: 포모도로 설정
  - `user_id` (PK, FK → user_profiles)
  - `study_duration`, `break_duration`

### 인덱스

주요 조회 성능 향상을 위한 인덱스:
- `user_profiles.email`
- `study_groups.owner_id`
- `group_members.group_id`, `group_members.user_id`
- `group_messages.group_id`, `group_messages.created_at`
- `study_sessions.group_id`, `study_sessions.user_id`
- `check_in_records.session_id`, `check_in_records.group_id`

## 🏗️ 아키텍처 패턴

### 레이어 구조

```
Routes (API 엔드포인트)
    ↓
Services (비즈니스 로직)
    ↓
Repositories (데이터 접근)
    ↓
Supabase (데이터베이스)
```

### 예시: 그룹 생성 플로우

1. **Route** (`groupRoutes.ts`)
   - 요청 수신 및 검증 (Zod)
   - 인증 확인 (authMiddleware)
   - Service 호출

2. **Service** (`groupService.ts`)
   - 비즈니스 로직 처리
   - 권한 확인
   - Repository 호출

3. **Repository** (`groupRepository.ts`)
   - Supabase 쿼리 실행
   - 데이터 변환

4. **Response**
   - 성공/실패 응답 반환

### 에러 처리 흐름

```
에러 발생
    ↓
Service에서 AppError throw
    ↓
Route에서 catch
    ↓
errorHandler 미들웨어
    ↓
적절한 HTTP 상태 코드 + 메시지 반환
```

## 🧪 테스트

```bash
# API 테스트 스크립트 실행
cd .. && bash test-api.sh
```

### 개발 워크플로우

#### 새 API 엔드포인트 추가 시

1. **타입 정의** (`server/src/types/index.ts`)
   ```typescript
   export interface CreateItemRequest {
     name: string;
     description?: string;
   }
   ```

2. **Zod 스키마** (`shared/schemas/`)
   ```typescript
   export const CreateItemSchema = z.object({
     name: z.string().min(1),
     description: z.string().optional(),
   });
   ```

3. **Repository** (`server/src/repositories/`)
   ```typescript
   async createItem(userId: string, data: CreateItemRequest): Promise<Item> {
     // Supabase 쿼리
   }
   ```

4. **Service** (`server/src/services/`)
   ```typescript
   async createItem(userId: string, data: CreateItemRequest): Promise<Item> {
     // 비즈니스 로직
     return await repository.createItem(userId, data);
   }
   ```

5. **Route** (`server/src/routes/`)
   ```typescript
   router.post('/', asyncHandler(async (req, res) => {
     const parsed = CreateItemSchema.parse(req.body);
     const userId = getUserId(req);
     const item = await service.createItem(userId, parsed);
     sendSuccess(res, item, '생성되었습니다.', 201);
   }));
   ```

6. **라우트 등록** (`server/src/index.ts`)
   ```typescript
   app.use('/api/items', itemRoutes);
   ```

## 📝 로깅

Winston을 사용한 구조화된 로깅:

- **error**: 에러 로그
- **warn**: 경고 로그
- **info**: 정보 로그
- **debug**: 디버그 로그 (개발 환경만)

로그 레벨은 `LOG_LEVEL` 환경 변수로 설정 가능합니다.

### 로그 형식

```typescript
logger.info('Server started', {
  port: PORT,
  environment: env.NODE_ENV,
});
```

로그는 JSON 형식으로 출력되며, 타임스탬프와 메타데이터가 포함됩니다.

## 🔧 개발 도구

### 린트 및 포맷팅

```bash
# 린트
yarn lint

# 자동 수정
yarn lint:fix

# 포맷팅
yarn format
```

### 빌드

```bash
# TypeScript 컴파일
yarn build

# 빌드 결과물 확인
ls dist/
```

## 🚨 에러 처리

모든 에러는 `errorHandler` 미들웨어에서 처리됩니다:

- Zod 검증 에러 → 400
- 인증 에러 → 401
- 권한 에러 → 403
- 리소스 없음 → 404
- 서버 에러 → 500

에러 응답 형식:

```json
{
  "success": false,
  "message": "에러 메시지"
}
```

## 🔐 보안 베스트 프랙티스

### 에러 처리

- 모든 에러는 `errorHandler` 미들웨어에서 처리
- Zod 검증 에러는 400 상태 코드로 반환
- 프로덕션 환경에서는 상세한 에러 정보를 클라이언트에 노출하지 않음

### 입력 검증

- 모든 입력값은 Zod 스키마로 검증
- SQL Injection 방지 (Supabase 사용)
- XSS 방지

### 요청 제한

- 일반 API: 100 requests/15분
- 인증 API: 5 requests/15분
- 헬스체크: 제한 없음

### 캐싱

- 메모리 기반 간단한 캐시 사용 (`server/src/utils/cache.ts`)
- 필요시 Redis로 확장 가능

## 📚 참고 문서

- **클라이언트 문서**: 루트 `README.md` 참고
- **데이터베이스 마이그레이션**: `.secure/database/migrations/` 참고
