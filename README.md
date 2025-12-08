# PostPolio - 스터디 그룹 채팅 앱 📚

React Native + Node.js 기반의 스터디 그룹 관리 및 실시간 채팅 애플리케이션입니다.

## 🚀 기술 스택

### 클라이언트 (React Native)

- **Expo** - React Native 개발 플랫폼
- **TypeScript** - 타입 안전성
- **Socket.IO** - 실시간 통신
- **Supabase** - 인증 및 데이터베이스
- **AsyncStorage** - 로컬 저장소

### 서버 (Node.js)

- **Express.js** - 웹 서버
- **Socket.IO** - WebSocket 통신
- **TypeScript** - 타입 안전성
- **Supabase** - 인증 및 데이터베이스
- **JWT** - 토큰 기반 인증

## 📁 프로젝트 구조

```
postpolio/
├── app/                    # React Native 앱
│   ├── (auth)/            # 인증 화면
│   ├── (tabs)/            # 메인 탭 화면
│   └── contexts/          # React Context
├── server/                # Node.js 서버
│   ├── src/               # 서버 소스코드
│   │   ├── routes/        # API 라우트
│   │   ├── services/      # 비즈니스 로직
│   │   ├── repositories/  # 데이터 접근
│   │   ├── socket/        # WebSocket 핸들러
│   │   └── middleware/    # 미들웨어
│   └── dist/              # 빌드 결과물
└── package.json           # 루트 의존성
```

## 🛠️ 설치 및 실행

### 1. 의존성 설치

```bash
# 루트 의존성 설치
npm install

# 서버 의존성 설치
cd server && npm install
```

### 2. 환경 변수 설정

```bash
# server/.env 파일 생성
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
PORT=4000
CORS_ORIGIN=*
```

### 3. 개발 서버 실행

```bash
# 서버 실행 (터미널 1)
cd server && npm run dev

# 클라이언트 실행 (터미널 2)
npm run web
```

## 🎯 주요 기능

- ✅ **실시간 채팅** - Socket.IO 기반
- ✅ **사용자 인증** - 이메일 회원가입/로그인
- ✅ **채팅 기록** - 메시지 히스토리 관리
- ✅ **사용자 식별** - 닉네임 및 아바타
- ✅ **시스템 메시지** - 입장/퇴장 알림
- ✅ **새 메시지 알림** - 스크롤 자동 이동

## 🔧 개발 도구

### 린트 설정

- **ESLint** - Airbnb 베이스 설정
- **TypeScript** - 타입 체크
- **자동 수정** - `npm run lint:fix`

### 실행 명령어

```bash
# 전체 린트
npm run lint

# 클라이언트 린트
npm run lint:client

# 서버 린트
npm run lint:server

# 자동 수정
npm run lint:fix
```

## 📱 사용법

1. **회원가입** - 이메일로 계정 생성
2. **로그인** - 계정으로 로그인
3. **채팅방 입장** - 자동으로 채팅방 참여
4. **메시지 전송** - 실시간 채팅
5. **로그아웃** - 계정 로그아웃

## 📋 스터디 그룹 앱 구현 계획

현재 `feature/study-groups` 브랜치에서 진행 중입니다.

### Phase 1: 데이터베이스 스키마 설계 및 생성 ✅ 구현 가능

**목표**: 스터디 그룹과 멤버 관계를 저장할 데이터베이스 테이블 생성

**작업 내용**:
1. Supabase에 `study_groups` 테이블 생성
   - `id` (UUID, PK)
   - `name` (TEXT, NOT NULL) - 그룹명
   - `description` (TEXT) - 그룹 설명
   - `owner_id` (UUID, FK → user_profiles.user_id)
   - `created_at`, `updated_at` (TIMESTAMPTZ)

2. `group_members` 테이블 생성
   - `group_id` (UUID, FK → study_groups.id)
   - `user_id` (UUID, FK → user_profiles.user_id)
   - `role` (TEXT, DEFAULT 'member') - 'owner' | 'admin' | 'member'
   - `joined_at` (TIMESTAMPTZ)
   - Composite PK: (group_id, user_id)

3. RLS 정책 설정
   - Service Role Key로 모든 작업 허용 (개발 환경)

**생성 파일**:
- `docs/SUPABASE_SETUP.md` 업데이트 (스키마 SQL 추가)

**체크리스트**:
- [ ] `study_groups` 테이블 생성 SQL 작성
- [ ] `group_members` 테이블 생성 SQL 작성
- [ ] 인덱스 생성 (group_id, user_id)
- [ ] RLS 정책 적용
- [ ] 문서 업데이트

---

### Phase 2: 서버 API 구현 ✅ 구현 가능

**목표**: 그룹 생성, 조회, 멤버 관리 API 엔드포인트 구현

**작업 내용**:

1. **타입 정의** (`server/src/types/index.ts`)
   - `StudyGroup` 인터페이스
   - `GroupMember` 인터페이스
   - `CreateGroupRequest`, `InviteMemberRequest` 등

2. **Repository 레이어** (`server/src/repositories/groupRepository.ts`)
   - `createGroup(ownerId, groupData)` - 그룹 생성
   - `getGroupById(groupId)` - 그룹 조회
   - `getUserGroups(userId)` - 사용자의 그룹 목록 조회
   - `addMember(groupId, userId, role)` - 멤버 추가
   - `removeMember(groupId, userId)` - 멤버 제거
   - `getGroupMembers(groupId)` - 그룹 멤버 목록 조회
   - `deleteGroup(groupId)` - 그룹 삭제

3. **Service 레이어** (`server/src/services/groupService.ts`)
   - `createGroup(userId, groupData)` - 그룹 생성 + 소유자 자동 추가
   - `getUserGroups(userId)` - 사용자 그룹 목록
   - `inviteMember(groupId, inviterId, inviteeEmail)` - 이메일로 멤버 초대
   - `leaveGroup(groupId, userId)` - 그룹 나가기
   - `deleteGroup(groupId, userId)` - 그룹 삭제 (소유자만)

4. **Routes** (`server/src/routes/groupRoutes.ts`)
   - `POST /api/groups` - 그룹 생성
   - `GET /api/groups` - 내 그룹 목록 조회
   - `GET /api/groups/:id` - 그룹 상세 조회
   - `POST /api/groups/:id/invite` - 멤버 초대
   - `DELETE /api/groups/:id/members/:userId` - 멤버 제거
   - `DELETE /api/groups/:id` - 그룹 삭제

5. **인증 미들웨어 적용**
   - 모든 엔드포인트에 `authMiddleware` 적용
   - 소유자/관리자 권한 체크 (필요시)

6. **Zod 스키마** (`shared/schemas/group.ts`)
   - `CreateGroupSchema`
   - `InviteMemberSchema`

**생성 파일**:
- `server/src/repositories/groupRepository.ts`
- `server/src/services/groupService.ts`
- `server/src/routes/groupRoutes.ts`
- `shared/schemas/group.ts`
- `server/src/types/index.ts` (타입 추가)

**체크리스트**:
- [ ] 타입 정의 추가
- [ ] Repository 구현
- [ ] Service 구현
- [ ] Routes 구현
- [ ] Zod 스키마 생성
- [ ] `server/src/index.ts`에 라우트 등록
- [ ] 에러 처리 및 검증

---

### Phase 3: Socket.IO 다중 채팅방 지원 ✅ 구현 가능

**목표**: 그룹별 채팅방 분리 및 그룹 멤버만 접근 가능하도록 제한

**작업 내용**:

1. **Socket 인증 연동**
   - Socket 연결 시 JWT 토큰 검증
   - `socket.data.userId` 설정

2. **그룹별 방 관리**
   - `socket.on('join', { groupId })` - 그룹 채팅방 입장
   - 그룹 멤버인지 확인 후 입장 허용
   - 그룹별 메시지 히스토리 분리 (`Map<groupId, Message[]>`)

3. **메시지 전송**
   - `socket.on('message', { groupId, text })` - 그룹 채팅방에 메시지 전송
   - 그룹 멤버인지 확인 후 전송 허용

4. **타입 확장** (`server/src/types/socket.ts`)
   - `ClientToServerEvents`에 `groupId` 추가
   - `ServerToClientEvents`에 그룹별 이벤트 추가

**수정 파일**:
- `server/src/socket/socketHandler.ts`
- `server/src/types/socket.ts`
- `server/src/middleware/authMiddleware.ts` (Socket 인증 추가)

**체크리스트**:
- [ ] Socket 인증 미들웨어 구현
- [ ] 그룹 멤버 검증 로직 추가
- [ ] 그룹별 메시지 히스토리 분리
- [ ] 타입 정의 업데이트
- [ ] 테스트

---

### Phase 4: 클라이언트 그룹 관리 UI ✅ 구현 가능

**목표**: 그룹 목록, 생성, 상세 화면 구현

**작업 내용**:

1. **홈 탭 개편** (`app/(tabs)/index.tsx`)
   - 내 스터디 그룹 목록 표시
   - 그룹 생성 버튼
   - 그룹 클릭 시 해당 그룹 채팅방으로 이동

2. **그룹 생성 화면** (`app/(tabs)/groups/create.tsx`)
   - 그룹명 입력
   - 설명 입력 (선택)
   - 생성 API 호출

3. **그룹 상세 화면** (`app/(tabs)/groups/[id].tsx`)
   - 그룹 정보 표시
   - 멤버 목록
   - 멤버 초대 버튼
   - 그룹 나가기/삭제 버튼

4. **API 클라이언트** (`config/api.ts`)
   - 그룹 관련 엔드포인트 추가

5. **타입 정의** (클라이언트용)
   - `types/group.ts` 생성 또는 공유 타입 사용

**생성/수정 파일**:
- `app/(tabs)/index.tsx` (홈 탭 개편)
- `app/(tabs)/groups/create.tsx` (새 파일)
- `app/(tabs)/groups/[id].tsx` (새 파일)
- `config/api.ts` (엔드포인트 추가)
- `types/group.ts` (선택적)

**체크리스트**:
- [ ] 홈 탭 그룹 목록 UI 구현
- [ ] 그룹 생성 화면 구현
- [ ] 그룹 상세 화면 구현
- [ ] API 호출 로직 구현
- [ ] 에러 처리 및 로딩 상태

---

### Phase 5: 그룹별 채팅 UI 연동 ✅ 구현 가능

**목표**: 선택한 그룹의 채팅방으로 이동 및 실시간 채팅

**작업 내용**:

1. **채팅 화면 개편** (`app/(tabs)/chat.tsx`)
   - 그룹 선택 상태 관리
   - 선택된 그룹의 채팅방에만 연결
   - 그룹이 선택되지 않으면 "그룹을 선택하세요" 메시지

2. **Socket.IO 클라이언트 수정**
   - 그룹 ID를 포함한 `join` 이벤트 전송
   - 그룹별 메시지 수신

3. **라우팅**
   - 홈 탭에서 그룹 클릭 → 채팅 탭으로 이동 + 그룹 선택
   - `router.push('/(tabs)/chat', { groupId })` 또는 Context 사용

4. **Context 추가** (`contexts/GroupContext.tsx`)
   - 선택된 그룹 상태 관리
   - 그룹 전환 로직

**수정 파일**:
- `app/(tabs)/chat.tsx`
- `contexts/GroupContext.tsx` (새 파일, 선택적)

**체크리스트**:
- [ ] 그룹 선택 상태 관리
- [ ] Socket.IO 그룹별 연결
- [ ] 그룹별 메시지 표시
- [ ] 그룹 전환 기능

---

### Phase 6: AI 일일 요약 기능 (선택적) ⚠️ 외부 API 필요

**목표**: Gemini API를 사용하여 그룹별 하루 대화 요약 생성

**작업 내용**:

1. **서버 서비스** (`server/src/services/summaryService.ts`)
   - `generateDailySummary(groupId, messages)` - 일일 요약 생성
   - Gemini API 호출
   - 요약 결과 저장 (선택적)

2. **스케줄러** (`server/src/scheduler/dailySummary.ts`)
   - 매일 자정 실행 (node-cron 또는 다른 스케줄러)
   - 모든 활성 그룹에 대해 요약 생성

3. **API 엔드포인트** (`server/src/routes/summaryRoutes.ts`)
   - `GET /api/groups/:id/summary` - 그룹 요약 조회

4. **클라이언트 UI**
   - 홈 탭에 그룹별 요약 카드 표시

**필수 환경 변수**:
- `GEMINI_API_KEY` (Google Gemini API 키)

**생성 파일**:
- `server/src/services/summaryService.ts`
- `server/src/scheduler/dailySummary.ts` (선택적)
- `server/src/routes/summaryRoutes.ts`

**체크리스트**:
- [ ] Gemini API 키 설정
- [ ] 요약 서비스 구현
- [ ] 스케줄러 설정 (선택적)
- [ ] API 엔드포인트 구현
- [ ] 클라이언트 UI 연동

---

## 🎯 구현 우선순위

1. **Phase 1** (데이터베이스) → **Phase 2** (서버 API) → **Phase 3** (Socket.IO)
2. **Phase 4** (그룹 관리 UI) → **Phase 5** (채팅 UI 연동)
3. **Phase 6** (AI 요약) - 선택적, 나중에 추가 가능

## 📝 참고사항

- 모든 API는 인증이 필요합니다 (`authMiddleware` 적용)
- 그룹 소유자만 그룹 삭제 가능
- 그룹 멤버만 해당 그룹 채팅방 접근 가능
- AI 요약 기능은 Gemini API 키가 필요하며, 비용이 발생할 수 있습니다
