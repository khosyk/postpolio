# PostPolio - WebSocket Chat App 💬

React Native + Node.js 기반의 실시간 채팅 애플리케이션입니다.

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

## 🚧 향후 계획

- [ ] 챗봇 연동
- [ ] 다중 채팅방 지원
- [ ] 파일 업로드
- [ ] 푸시 알림
