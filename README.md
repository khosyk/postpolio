# 딥웰스터디 (Deep Well Study)

공부 집중 케어를 위한 React Native 기반 스터디 그룹 관리 및 실시간 경쟁 애플리케이션입니다.

## 📖 이 문서에 대해

이 문서는 프로젝트의 **완전한 가이드**입니다. 이 문서만 읽으면:
- ✅ 프로젝트 전체 구조 이해
- ✅ 개발 환경 설정 및 실행
- ✅ 새 기능 추가 방법
- ✅ 기존 코드 수정 방법
- ✅ 문제 해결 방법

**다른 개발자나 AI 에이전트가 이 문서만으로 프로젝트를 이해하고 작업할 수 있도록 작성되었습니다.**

## 📑 목차

1. [앱 정보](#-앱-정보)
2. [기술 스택](#-기술-스택)
3. [아키텍처 개요](#️-아키텍처-개요)
4. [프로젝트 구조](#-프로젝트-구조)
5. [설치 및 실행](#️-설치-및-실행)
6. [주요 기능](#-주요-기능)
7. [화면 구성](#-화면-구성)
8. [개발 가이드](#-개발-가이드)
   - [API 클라이언트 사용법](#api-클라이언트-사용법)
   - [Socket.IO 클라이언트 사용법](#socketio-클라이언트-사용법)
   - [상태 관리](#상태-관리-context)
   - [주요 컴포넌트](#주요-컴포넌트)
   - [코드 컨벤션](#코드-컨벤션)
   - [개발 워크플로우](#개발-워크플로우)
9. [실제 사용 시나리오](#-실제-사용-시나리오)
10. [기능 간 연동](#-기능-간-연동)
11. [데이터베이스 스키마](#-데이터베이스-스키마)
12. [빌드 및 배포](#-빌드-및-배포)
13. [보안](#-보안)
14. [트러블슈팅](#-트러블슈팅)
15. [Git Flow](#-git-flow)
16. [주요 파일 위치 가이드](#-주요-파일-위치-가이드)
17. [빠른 참조](#-빠른-참조)

## 📱 앱 정보

- **이름**: 딥웰스터디
- **패키지명**: `com.nopaji.deepwellstudy`
- **버전**: 1.0.0
- **지원 언어**: 한국어, 영어 (i18n)

## 🚀 기술 스택

### 클라이언트 (React Native)

- **Expo SDK 53** - React Native 개발 플랫폼
- **TypeScript** - 타입 안전성
- **Expo Router** - 파일 기반 라우팅
- **Socket.IO Client** - 실시간 통신
- **React Native Gifted Charts** - 차트 라이브러리 (라인, 레이더 차트)
- **expo-notifications** - 로컬 알림
- **expo-localization** - 다국어 지원
- **i18next** - 국제화 프레임워크
- **AsyncStorage** - 로컬 저장소
- **React Context** - 상태 관리

### 주요 라이브러리

- `react-native-gifted-charts` - 네이티브 차트 렌더링
- `react-native-svg` - SVG 렌더링
- `react-native-reanimated` - 애니메이션
- `expo-haptics` - 햅틱 피드백

## 🏗️ 아키텍처 개요

### 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│              React Native Client (Expo)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Auth    │  │  Group  │  │ Pomodoro│  │  Stats  │  │
│  │ Context  │  │ Context │  │ Context │  │ Context │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│         │            │            │            │        │
│         └────────────┴────────────┴────────────┘        │
│                      │                                    │
│         ┌────────────▼────────────┐                      │
│         │   API Client            │                      │
│         │   Socket Client         │                      │
│         └────────────┬────────────┘                      │
└──────────────────────┼──────────────────────────────────┘
                       │ HTTP / WebSocket
                       ▼
┌─────────────────────────────────────────────────────────┐
│           Express Server + Socket.IO                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Routes  │→ │ Services │→ │Repositories│            │
│  └──────────┘  └──────────┘  └──────────┘              │
│         │            │            │                     │
│         └────────────┴────────────┘                     │
│                      │                                    │
│         ┌────────────▼────────────┐                      │
│         │   Socket Handlers       │                      │
│         └────────────┬────────────┘                      │
└──────────────────────┼──────────────────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │    Supabase     │
              │   (PostgreSQL)  │
              └─────────────────┘
```

### 데이터 흐름

#### 1. 인증 플로우
```
사용자 로그인
    ↓
POST /api/auth/signin
    ↓
서버: JWT 토큰 생성
    ↓
클라이언트: 토큰 저장 (AsyncStorage)
    ↓
모든 API 요청에 토큰 포함
```

#### 2. 실시간 채팅 플로우
```
사용자 채팅방 입장
    ↓
Socket.IO 연결 (토큰 인증)
    ↓
socket.emit('join', groupId)
    ↓
서버: 그룹 멤버 확인 → 입장 허용
    ↓
서버: 메시지 히스토리 전송
    ↓
클라이언트: 메시지 표시
```

#### 3. 공부 세션 플로우
```
사용자 "공부 시작" 클릭
    ↓
Socket.IO: study:start 이벤트
    ↓
서버: study_sessions 테이블에 세션 생성
    ↓
서버: 포모도로 세션도 함께 생성 (통계 연동)
    ↓
클라이언트: AsyncStorage에 세션 정보 저장
    ↓
체크인 간격마다 체크인 버튼 표시
    ↓
체크인 완료 시 공부 시간 인정
    ↓
실시간 랭킹 업데이트
```

### 주요 기술 스택 역할

- **Expo Router**: 파일 기반 라우팅 (Next.js와 유사)
- **React Context**: 전역 상태 관리 (인증, 그룹, 테마)
- **Socket.IO**: 실시간 양방향 통신 (채팅, 공부 세션)
- **AsyncStorage**: 로컬 데이터 저장 (토큰, 세션 정보)
- **Supabase**: 백엔드 서비스 (인증, 데이터베이스)

## 📁 프로젝트 구조

```
deepwellstudy/
├── app/                          # Expo Router 앱 화면
│   ├── (auth)/                   # 인증 화면 (로그인, 회원가입)
│   ├── (tabs)/                   # 메인 탭 화면
│   │   ├── index.tsx             # 홈 (그룹 목록)
│   │   ├── explore.tsx            # 그룹 챗 목록
│   │   ├── pomodoro.tsx          # 포모도로 타이머
│   │   ├── stats.tsx             # 공부 통계
│   │   └── grades.tsx            # 성적표 관리
│   ├── chat/[groupId].tsx        # 그룹 채팅방
│   ├── groups/                   # 그룹 관리 화면
│   ├── grades/                   # 성적표 화면
│   └── profile/                  # 프로필 화면
├── components/                   # 공통 컴포넌트
│   ├── RadarChart.tsx            # 방사형 그래프
│   ├── LineChart.tsx             # 선 그래프
│   ├── RankingChip.tsx          # 랭킹 칩
│   ├── TimerGauge.tsx            # 타이머 게이지
│   ├── CircularProgress.tsx     # 원형 프로그레스
│   ├── CheckInButton.tsx         # 체크인 버튼
│   └── ui/                       # UI 컴포넌트
├── constants/                    # 상수 정의
│   ├── colors.ts                 # 색상 테마
│   ├── socket.ts                 # Socket.IO 이벤트 타입
│   └── storage.ts                # AsyncStorage 키
├── contexts/                     # React Context
│   ├── AuthContext.tsx           # 인증 상태
│   ├── GroupContext.tsx          # 그룹 상태
│   └── ThemeContext.tsx          # 테마 상태
├── i18n/                         # 다국어 설정
│   ├── index.ts                  # i18n 초기화
│   └── locales/                  # 번역 파일
│       ├── ko.ts                 # 한국어
│       └── en.ts                 # 영어
├── types/                        # TypeScript 타입 정의
│   ├── grade.ts                  # 성적표 타입
│   ├── group.ts                  # 그룹 타입
│   └── pomodoro.ts               # 포모도로 타입
├── utils/                        # 유틸리티 함수
│   ├── apiClient.ts              # API 클라이언트
│   └── socketClient.ts           # Socket.IO 클라이언트
├── config/                       # 설정 파일
│   └── api.ts                    # API 엔드포인트
└── server/                       # Node.js 백엔드 서버
```

## 🛠️ 설치 및 실행

### 필수 요구사항

- Node.js 18+ 
- Yarn 또는 npm
- Expo CLI (`npm install -g expo-cli`)
- iOS 시뮬레이터 (macOS) 또는 Android 에뮬레이터

### 1. 의존성 설치

```bash
# 루트 의존성 설치
yarn install

# 서버 의존성 설치
cd server && yarn install && cd ..
```

### 2. 환경 변수 설정

#### 클라이언트 환경 변수

`.env` 파일 생성 (루트 디렉토리):

```env
# API 서버 URL (개발: localhost, 프로덕션: 실제 서버 URL)
EXPO_PUBLIC_API_URL=http://localhost:4000

# Socket.IO 서버 URL (일반적으로 API URL과 동일)
EXPO_PUBLIC_SOCKET_URL=http://localhost:4000
```

**주의**: 
- Android 에뮬레이터는 `localhost` 대신 `10.0.2.2` 사용
- iOS 시뮬레이터는 `localhost` 사용 가능
- 실제 기기 테스트 시 컴퓨터의 로컬 IP 주소 사용 필요

#### 서버 환경 변수

`server/.env` 파일 생성:

```env
NODE_ENV=development
PORT=4000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
CORS_ORIGIN=*
LOG_LEVEL=info
```

**보안 주의**: `.env` 파일은 절대 Git에 커밋하지 마세요!

### 3. 개발 서버 실행

```bash
# Expo 개발 서버 시작
yarn start

# 또는 특정 플랫폼 실행
yarn ios      # iOS 시뮬레이터
yarn android  # Android 에뮬레이터
yarn web      # 웹 브라우저
```

**서버도 함께 실행해야 합니다** (별도 터미널):

```bash
cd server && yarn dev
```

## 🎯 주요 기능

### 1. 인증 시스템
- 이메일 회원가입/로그인
- JWT 토큰 기반 인증
- 프로필 관리 (닉네임, 아바타)

### 2. 스터디 그룹 관리
- 그룹 생성 및 참여
- 그룹 멤버 관리
- 그룹 설정 (채팅 허용/금지, 체크인 간격)

### 3. 실시간 채팅
- 그룹별 채팅방 분리
- 실시간 메시지 전송/수신
- 메시지 히스토리 관리
- 시스템 메시지 (입장/퇴장)

### 4. 실시간 공부 경쟁 시스템

**동작 방식**:
1. 사용자가 "공부 시작" 버튼 클릭
2. Socket.IO로 `study:start` 이벤트 전송
3. 서버에서 `study_sessions` 테이블에 세션 생성
4. 포모도로 세션도 함께 생성 (그룹챗과 통계 연동)
5. 방장이 설정한 `check_in_interval`마다 체크인 버튼 표시
6. 체크인 완료 시 해당 시간까지의 공부 시간 인정
7. 실시간으로 Top 5 랭킹 업데이트 (`study:ranking:update` 이벤트)
8. 내 카드칩에 게이지 효과 (오늘 공부 시간 / 8시간 기준)

**체크인 시스템**:
- 방장이 `/checkin` 명령어 전송 또는 `study:checkin:request` 이벤트 발생
- 모든 멤버에게 체크인 버튼 표시
- 방장이 먼저 체크인해야 다른 멤버도 인정됨
- 시간 내에 체크인하지 않으면 해당 구간 공부 시간 미인정

### 5. 포모도로 타이머

**동작 방식**:
1. 사용자가 공부/휴식 시간 설정 (설정 모달)
2. "공부 시작" 버튼 클릭
3. API로 포모도로 세션 생성 (`POST /api/pomodoro/sessions`)
4. 로컬 타이머 시작 (AsyncStorage에 상태 저장)
5. 시간 종료 시 알림 표시 및 자동 휴식 모드 전환
6. 세션 완료 시 API 호출 (`PUT /api/pomodoro/sessions/:id/complete`)
7. 통계 업데이트 (완료 세트 수, 총 공부 시간)

**그룹챗 연동**:
- 그룹챗에서 "공부 시작" 시 포모도로 세션도 함께 생성
- AsyncStorage에 세션 정보 저장하여 포모도로 탭과 공유
- 공부 시간이 통계 탭에 반영됨

**백그라운드 지원**:
- 앱이 백그라운드에 있어도 타이머 계속 동작
- 앱 재시작 시 AsyncStorage에서 세션 복원

### 6. 공부 통계
- 일별/주간/월별 공부 시간 시각화
- 선 그래프로 공부 시간 추이 확인
- 통계 요약 (총 시간, 평균, 최대값)
- 날짜 범위 선택

### 7. 성적표 관리
- 시험별 성적표 관리
- 과목별 목표/현재 점수 입력
- 방사형 그래프로 성적 시각화
- 시험 템플릿 지원
- 최고 점수 설정 가능

### 8. 다국어 지원
- 한국어/영어 자동 감지
- 앱 전체 번역 적용

### 9. 다크 모드
- 시스템 설정에 따른 자동 전환
- 수동 테마 변경 지원

## 📱 화면 구성

### 탭 네비게이션

1. **홈** - 그룹 목록 및 다가오는 시험
2. **그룹 챗** - 그룹 채팅방 목록 (그룹이 있을 때만 표시)
3. **통계** - 공부 시간 통계 및 그래프
4. **포모도로** - 개인 타이머
5. **성적표** - 시험 및 성적 관리

### 주요 화면

- **채팅방** (`app/chat/[groupId].tsx`)
  - 실시간 채팅
  - 내 카드칩 (게이지 효과)
  - 다른 참여자 랭킹 (수평 스크롤)
  - 공부 시작/종료 버튼
  - 포모도로 설정 (헤더 버튼)
  - 공부/휴식 시간 자동 전환
  - 30초 전 카운트다운

- **포모도로 타이머** (`app/(tabs)/pomodoro.tsx`)
  - 원형 타이머
  - 공부/휴식 세션 관리
  - 설정 모달
  - 오늘 통계

- **통계** (`app/(tabs)/stats.tsx`)
  - 날짜 범위 선택
  - 선 그래프
  - 통계 요약

- **성적표** (`app/(tabs)/grades.tsx`)
  - 시험 목록
  - 시험 생성/수정/삭제
  - 방사형 그래프 (3개 이상 과목)

## 💻 개발 가이드

### 시작하기 전에

프로젝트를 처음 시작하는 경우:

1. **저장소 클론**
   ```bash
   git clone <repository-url>
   cd postpolio
   ```

2. **의존성 설치**
   ```bash
   yarn install
   cd server && yarn install && cd ..
   ```

3. **환경 변수 설정**
   - 루트 `.env` 파일 생성
   - `server/.env` 파일 생성

4. **데이터베이스 설정**
   - Supabase 프로젝트 생성
   - `.secure/database/migrations/SUPABASE_COMPLETE_SETUP.sql` 실행

5. **서버 실행**
   ```bash
   cd server && yarn dev
   ```

6. **클라이언트 실행**
   ```bash
   yarn start
   ```

### API 클라이언트 사용법

모든 API 호출은 `utils/apiClient.ts`의 `apiFetch` 함수를 사용합니다.

```typescript
import { apiFetch } from '@/utils/apiClient';
import { getApiUrl } from '@/config/api';

// GET 요청
const data = await apiFetch<ResponseType>(getApiUrl('/api/groups'), {
  method: 'GET',
  requireAuth: true,
});

// POST 요청
const result = await apiFetch<ResponseType>(getApiUrl('/api/groups'), {
  method: 'POST',
  requireAuth: true,
  body: JSON.stringify({ name: '그룹명' }),
});
```

**주요 옵션**:
- `requireAuth`: 인증 토큰 필요 여부 (기본값: `true`)
- `autoHandleAuthError`: 인증 에러 시 자동 로그아웃 (기본값: `true`)
- `showAuthErrorAlert`: 인증 에러 시 Alert 표시 (기본값: `true`)

### Socket.IO 클라이언트 사용법

실시간 통신은 `utils/socketClient.ts`를 사용합니다.

```typescript
import { connectSocket, disconnectSocket } from '@/utils/socketClient';
import { clientToServerEvents, serverToClientEvents } from '@/constants/socket';

// Socket 연결
const socket = await connectSocket();

// 이벤트 전송
socket.emit(clientToServerEvents.join, groupId);
socket.emit(clientToServerEvents.message, { roomId: groupId, text: '메시지' });

// 이벤트 수신
socket.on(serverToClientEvents.message, (message) => {
  console.log('새 메시지:', message);
});

// 연결 해제
disconnectSocket();
```

**주의사항**:
- Socket 연결은 인증 토큰이 필요합니다
- 컴포넌트 언마운트 시 이벤트 리스너를 제거해야 합니다
- `useEffect`의 cleanup 함수에서 `socket.off()` 호출

**실제 사용 예시** (`app/chat/[groupId].tsx` 참고):
```typescript
useEffect(() => {
  if (!groupId || !user) return;
  
  let socketInstance: Socket | null = null;
  
  const initSocket = async () => {
    socketInstance = await connectSocket();
    
    // 이벤트 리스너 등록
    socketInstance.on(serverToClientEvents.message, handleMessage);
    socketInstance.on(serverToClientEvents.studyRankingUpdate, handleRankingUpdate);
    
    // 채팅방 입장
    socketInstance.emit(clientToServerEvents.join, groupId);
  };
  
  initSocket();
  
  // Cleanup: 컴포넌트 언마운트 시 리스너 제거
  return () => {
    if (socketInstance) {
      socketInstance.off(serverToClientEvents.message);
      socketInstance.off(serverToClientEvents.studyRankingUpdate);
      disconnectSocket();
    }
  };
}, [groupId, user]);
```

### 상태 관리 (Context)

#### AuthContext 사용

```typescript
import { useAuth } from '@/contexts/AuthContext';

const MyComponent = () => {
  const { user, loading, login, logout } = useAuth();
  
  if (loading) return <Loading />;
  if (!user) return <LoginScreen />;
  
  return <div>안녕하세요, {user.email}</div>;
};
```

#### ThemeContext 사용

```typescript
import { useTheme } from '@/contexts/ThemeContext';

const MyComponent = () => {
  const { isDark, themeColors } = useTheme();
  
  return (
    <View style={{ backgroundColor: themeColors.background }}>
      <Text style={{ color: themeColors.textPrimary }}>텍스트</Text>
    </View>
  );
};
```

### 주요 컴포넌트

#### RadarChart (방사형 그래프)

**용도**: 성적표에서 과목별 목표/현재 점수를 방사형으로 시각화

```typescript
import RadarChart from '@/components/RadarChart';

<RadarChart
  data={[
    { subject: '수학', target: 90, current: 85 },
    { subject: '영어', target: 80, current: 75 },
    { subject: '과학', target: 85, current: 80 },
  ]}
  size={280}
  colors={{ target: colors.blue500, current: colors.green500 }}
/>
```

**동작 방식**:
- 3개 이상 과목: 방사형 그래프 표시
- 2개 이하 과목: 박스 형태 UI로 표시 (`app/grades/[examId]/subjects.tsx` 참고)
- 각 축은 과목, 외곽 선은 목표 점수, 내부 선은 현재 점수

**사용 위치**: `app/grades/[examId]/subjects.tsx`

#### LineChart (선 그래프)

**용도**: 공부 통계에서 일별/주간/월별 공부 시간 추이 시각화

```typescript
import LineChart from '@/components/LineChart';

<LineChart
  data={[
    { date: '2024-01-01', value: 120 },
    { date: '2024-01-02', value: 150 },
  ]}
  maxValue={200}
  minValue={0}
  onTouch={(date, value) => console.log(date, value)}
/>
```

**특징**:
- 그라데이션 채우기 (공부량에 따라 색상 변화)
- 터치 시 툴팁 표시
- 수평 스크롤 지원

**사용 위치**: `app/(tabs)/stats.tsx`

#### RankingChip (랭킹 칩)

**용도**: 그룹 채팅방에서 Top 5 랭킹 표시

```typescript
import RankingChip from '@/components/RankingChip';

<RankingChip
  rank={1}
  displayName="사용자명"
  avatar="👤"
  totalMinutes={120}
/>
```

**특징**:
- 순위별 색상 테두리 (1등: 파란색, 5등: 빨간색)
- 회전하는 그라데이션 애니메이션
- 아바타, 닉네임, 공부 시간 표시

**사용 위치**: `app/chat/[groupId].tsx`

### 코드 컨벤션

#### 컴포넌트 작성 규칙

**기본 구조**:
```typescript
// 컴포넌트 상단에 Props 인터페이스 정의
interface Props {
  required: string;        // 필수 props 먼저
  required2: number;
  optional?: string;       // 옵셔널 props 나중에
}

// 한 줄 설명 주석
const MyComponent = ({ required, required2, optional }: Props) => {
  // 조기 반환으로 불필요한 렌더링 방지
  if (!required) return null;
  
  return <Container>{/* ... */}</Container>;
};

export default MyComponent;
```

**규칙**:
1. **Functional Component 사용**: `React.FC` 사용하지 않음
2. **Props 인터페이스**: 컴포넌트 상단에 정의, 필수 props 먼저
3. **타입 안전성**: `any` 타입 사용 금지
4. **주석**: 한 줄 설명 주석 추가 (한 줄 이내)
5. **조기 반환**: 조건부 렌더링은 `if (!item) return null` 사용

**실제 예시** (`components/RankingChip.tsx` 참고):
```typescript
interface RankingChipProps {
  rank: number;
  displayName: string;
  avatar: string;
  totalMinutes: number;
}

// 랭킹 칩 컴포넌트 (그라데이션 애니메이션 포함)
const RankingChip: React.FC<RankingChipProps> = ({ 
  rank, 
  displayName, 
  avatar, 
  totalMinutes 
}) => {
  // 애니메이션 로직
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  return (
    <View style={styles.container}>
      {/* 컴포넌트 내용 */}
    </View>
  );
};
```

#### 스타일 작성 규칙

**기본 규칙**:
1. **styled-components 사용**: `Styled` 접두사 사용
2. **색상**: `colors.ts` 또는 `getThemeColors()` 사용
3. **다크 모드**: 항상 `useTheme()` 훅으로 테마 색상 사용 (`useColorScheme` 및 `@/hooks/useColorScheme` 사용 금지)
4. **접미사**: 태그명 접미사 사용 (`StyledContainerView`, `StyledTitleText`)

**예시**:
```typescript
import { useTheme } from '@/contexts/ThemeContext';
import { getThemeColors } from '@/constants/colors';

const MyComponent = () => {
  const { isDark } = useTheme();
  const themeColors = getThemeColors(isDark);
  
  return (
    <View style={{ backgroundColor: themeColors.background }}>
      <Text style={{ color: themeColors.textPrimary }}>텍스트</Text>
    </View>
  );
};
```

**styled-components 사용 시**:
```typescript
const StyledContainerView = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.background};
`;

const StyledTitleText = styled.Text`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.textPrimary};
`;
```

#### API 쿼리 작성 규칙

**현재 프로젝트는 React Query를 사용하지 않습니다.** 대신 `apiFetch` 유틸리티를 직접 사용합니다.

**기본 패턴**:
```typescript
import { apiFetch } from '@/utils/apiClient';
import { getApiUrl } from '@/config/api';

const fetchGroups = async () => {
  try {
    const data = await apiFetch<{ data: { groups: Group[] } }>(
      getApiUrl('/api/groups'),
      {
        method: 'GET',
        requireAuth: true,
      }
    );
    return data.data?.groups || [];
  } catch (error) {
    console.error('그룹 목록 조회 실패:', error);
    return [];
  }
};
```

**컴포넌트에서 사용**:
```typescript
const [groups, setGroups] = useState<Group[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadGroups = async () => {
    setLoading(true);
    const data = await fetchGroups();
    setGroups(data);
    setLoading(false);
  };
  loadGroups();
}, []);
```

**에러 처리**:
- `apiFetch`는 자동으로 인증 에러 처리 (기본값)
- 네트워크 에러는 `try-catch`로 처리
- 사용자에게는 Alert 또는 Toast로 표시

### 개발 워크플로우

#### 새 기능 추가 시 (예: 알림 기능)

**1단계: 브랜치 생성**
```bash
yarn gf:start feature-notifications
```

**2단계: 타입 정의**

클라이언트 타입 (`types/notification.ts`):
```typescript
export interface Notification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}
```

서버 타입 (`server/src/types/index.ts`):
```typescript
export interface Notification extends Notification {
  user_id: string;
}
```

Zod 스키마 (`shared/schemas/notification.ts`):
```typescript
export const CreateNotificationSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
});
```

**3단계: 서버 구현**

Repository (`server/src/repositories/notificationRepository.ts`):
```typescript
async createNotification(userId: string, data: CreateNotificationRequest) {
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert([{ user_id: userId, ...data }])
    .select()
    .single();
  if (error) throw error;
  return notification;
}
```

Service (`server/src/services/notificationService.ts`):
```typescript
async createNotification(userId: string, data: CreateNotificationRequest) {
  // 비즈니스 로직 (예: 권한 확인)
  return await repository.createNotification(userId, data);
}
```

Route (`server/src/routes/notificationRoutes.ts`):
```typescript
router.post('/', asyncHandler(async (req, res) => {
  const parsed = CreateNotificationSchema.parse(req.body);
  const userId = getUserId(req);
  const notification = await service.createNotification(userId, parsed);
  sendSuccess(res, notification, '알림이 생성되었습니다.', 201);
}));
```

**4단계: 클라이언트 구현**

API 엔드포인트 추가 (`config/api.ts`):
```typescript
NOTIFICATIONS: {
  CREATE: '/api/notifications',
  LIST: '/api/notifications',
}
```

컴포넌트 작성 (`app/(tabs)/notifications.tsx`):
```typescript
const NotificationsScreen = () => {
  const { data } = useGetNotifications();
  return <FlatList data={data} renderItem={...} />;
};
```

**5단계: 테스트 및 커밋**
```bash
yarn lint
yarn lint:fix
git add .
git commit -m "feat: 알림 기능 추가"
git push
```

#### 기존 기능 수정 시

1. **해당 파일 찾기**
   - 화면: `app/` 폴더에서 검색
   - 컴포넌트: `components/` 폴더에서 검색
   - API: `server/src/routes/` 폴더에서 검색

2. **수정 전 이해하기**
   - 관련 타입 확인 (`types/`, `server/src/types/`)
   - 데이터 흐름 파악 (Route → Service → Repository)
   - 관련 컴포넌트 확인

3. **수정 및 테스트**
   - 기능 테스트
   - 린트 실행
   - 타입 체크

#### 문제 해결

**Socket.IO 연결 실패**
- 인증 토큰 확인
- 서버 실행 상태 확인
- 네트워크 연결 확인

**API 요청 실패**
- 토큰 만료 확인 (자동 갱신됨)
- 서버 로그 확인
- 네트워크 탭에서 요청/응답 확인

**타입 에러**
- `yarn lint` 실행하여 타입 체크
- `any` 타입 사용 금지
- 명시적 타입 지정

**빌드 에러**
- `node_modules` 삭제 후 재설치
- 캐시 클리어: `expo start -c`
- TypeScript 컴파일 확인: `cd server && yarn build`

## 🔧 개발 도구

### 린트 및 포맷팅

```bash
# 전체 린트
yarn lint

# 클라이언트만 린트
yarn lint:client

# 자동 수정
yarn lint:fix

# 포맷팅
yarn format
```

### Git Flow

```bash
# 기능 브랜치 시작
yarn gf:start

# 릴리스 브랜치 시작
yarn gf:release

# 릴리스 완료
yarn gf:finish
```

## 📦 빌드 및 배포

### 개발 빌드

```bash
# iOS 개발 빌드 (Dev Client)
yarn dev:ios

# Android 개발 빌드 (Dev Client)
yarn dev:android
```

> **expo-notifications 관련 주의사항**  
> - Expo SDK 53부터 **Expo Go에서는 푸시 알림(Android 원격 알림)** 기능이 완전히 지원되지 않습니다.  
> - 알림(특히 푸시 토큰/원격 푸시)을 제대로 테스트하려면 **Expo Dev Client 기반 개발 빌드**를 사용해야 합니다.  
> - 위의 `yarn dev:ios`, `yarn dev:android` 스크립트는 이 Dev Client를 만드는 용도로 사용합니다.

### 프로덕션 빌드

```bash
# iOS 프로덕션 빌드
eas build --profile production --platform ios

# Android 프로덕션 빌드
eas build --profile production --platform android
```

### 환경 변수 설정

프로덕션 빌드 전 `eas.json` 또는 환경 변수로 설정:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.deepwellstudy.com",
        "EXPO_PUBLIC_SOCKET_URL": "https://api.deepwellstudy.com"
      }
    }
  }
}
```

### 서버 배포

1. **환경 변수 설정**
   - 프로덕션 Supabase URL 및 키 설정
   - `NODE_ENV=production` 설정

2. **빌드**
   ```bash
   cd server
   yarn build
   ```

3. **실행**
   ```bash
   yarn start
   ```

4. **PM2 사용 (권장)**
   ```bash
   pm2 start dist/index.js --name deepwellstudy-server
   ```

## 🔒 보안

### 클라이언트 보안

- 모든 API 요청은 JWT 토큰 인증 필요
- 토큰은 AsyncStorage에 암호화되어 저장 (기본 보안)
- Refresh Token으로 Access Token 자동 갱신
- 민감한 정보는 환경 변수로 관리
- SQL 마이그레이션 파일은 `.secure/database/migrations/` 폴더에 보관

### 서버 보안

- Helmet.js로 보안 헤더 설정
- CORS 설정으로 허용된 도메인만 접근 가능
- Rate Limiting으로 DDoS 공격 방지
- 모든 입력값 Zod 스키마로 검증
- SQL Injection 방지 (Supabase 사용)
- XSS 방지

## 🐛 트러블슈팅

### 일반적인 문제

**문제**: Expo 서버가 시작되지 않음
- 해결: `expo start -c` (캐시 클리어)

**문제**: Android에서 API 연결 실패
- 해결: `.env`에서 `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000` 설정

**문제**: Socket.IO 연결 실패
- 해결: 서버 실행 상태 확인, 인증 토큰 확인

**문제**: 타입 에러 발생
- 해결: `yarn lint` 실행, `any` 타입 제거

**문제**: 빌드 실패
- 해결: `node_modules` 삭제 후 `yarn install` 재실행

### 데이터베이스 문제

**문제**: 마이그레이션 적용 실패
- 해결: Supabase Dashboard에서 SQL 직접 실행
- 순서: `SUPABASE_COMPLETE_SETUP.sql` → 기타 마이그레이션 파일들

**문제**: RLS 정책 에러
- 해결: Service Role Key 사용 확인, RLS 정책 재설정

## 📊 데이터베이스 스키마

### 주요 테이블

- **user_profiles**: 사용자 프로필 정보
- **study_groups**: 스터디 그룹 정보
  - `chat_enabled`: 채팅 허용 여부
  - `check_in_interval`: 체크인 간격 (분)
- **group_members**: 그룹 멤버 관계
- **group_messages**: 채팅 메시지
- **study_sessions**: 공부 세션 (그룹 공부)
- **check_in_records**: 체크인 기록
- **exams**: 시험 정보
  - `max_score`: 최고 점수 (기본값: 100)
- **grade_records**: 성적 기록
- **pomodoro_sessions**: 포모도로 세션
- **pomodoro_settings**: 포모도로 설정

### 관계도

```
user_profiles (1) ──< (N) group_members >── (N) study_groups
                                              │
                                              ├──< (N) group_messages
                                              ├──< (N) study_sessions
                                              └──< (N) check_in_records

user_profiles (1) ──< (N) exams >──< (N) grade_records
user_profiles (1) ──< (N) pomodoro_sessions
user_profiles (1) ──< (1) pomodoro_settings
```

**마이그레이션 파일**: `.secure/database/migrations/` 폴더 참고

## 📚 추가 문서

- **서버 문서**: `server/README.md` 참고
- **데이터베이스 마이그레이션**: `.secure/database/README.md` 참고

## 🔀 Git Flow

프로젝트는 Git Flow 방식으로 관리됩니다.

### 브랜치 전략

- **메인 개발 브랜치**: `main`
- **프로덕션 브랜치**: `master` (배포 시점에만 사용)
- **기능 브랜치**: `feature/<name>`
- **릴리즈 브랜치**: `release/x.y.z`
- **핫픽스 브랜치**: `hotfix/x.y.z+1`

### Yarn 스크립트

```bash
# 기능 브랜치 시작
yarn gf:start feature-name

# 릴리즈 브랜치 시작
yarn gf:release 0.1.0

# 릴리즈 완료 (master에 머지 및 태그 생성)
yarn gf:finish 0.1.0
```

### 커밋 컨벤션 (Conventional Commits)

- `feat: ...` - 사용자 기능 추가
- `fix: ...` - 버그 수정
- `chore: ...` - 빌드/도구/잡무 변경
- `docs: ...` - 문서 변경
- `refactor: ...` - 리팩터링
- `test: ...` - 테스트 추가/변경

## 🤝 기여

기능 개발은 `feature/*` 브랜치에서 진행하세요.

## 🎬 실제 사용 시나리오

### 시나리오 1: 사용자가 그룹에서 공부하기

1. **그룹 생성**
   - 홈 탭 → "그룹 생성" 버튼
   - 그룹명 입력, 체크인 간격 설정 (예: 30분)
   - API: `POST /api/groups`

2. **그룹 참여**
   - 다른 사용자가 그룹 코드로 참여
   - API: `POST /api/groups/:id/invite`

3. **채팅방 입장**
   - 그룹 챗 탭 → 그룹 선택
   - Socket.IO 연결 및 `join` 이벤트 전송
   - 서버: 그룹 멤버 확인 → 입장 허용

4. **공부 시작**
   - "공부 시작" 버튼 클릭
   - Socket.IO: `study:start` 이벤트
   - 서버: `study_sessions` 테이블에 세션 생성
   - 서버: 포모도로 세션도 함께 생성 (`pomodoro_sessions`)
   - 클라이언트: AsyncStorage에 세션 정보 저장
   - 클라이언트: 알림 표시 (상태바)

5. **체크인**
   - 30분 후 방장이 체크인 요청 (`study:checkin:request`)
   - 모든 멤버에게 체크인 버튼 표시
   - 방장 먼저 체크인 → 다른 멤버도 체크인 가능
   - 체크인 완료 시 공부 시간 인정

6. **공부 종료**
   - "공부 종료" 버튼 클릭
   - Socket.IO: `study:stop` 이벤트
   - 서버: 세션 종료 처리
   - 클라이언트: AsyncStorage에서 세션 정보 제거
   - 클라이언트: 알림 제거

7. **통계 확인**
   - 통계 탭에서 오늘 공부 시간 확인
   - 포모도로 탭에서 완료 세트 수 확인
   - 두 탭 모두 동일한 데이터 표시 (공유 세션)

### 시나리오 2: 성적표 관리

1. **시험 생성**
   - 성적표 탭 → "+" 버튼
   - 시험명, 날짜, 최고 점수 입력
   - API: `POST /api/grades/exams`

2. **과목 추가**
   - 시험 상세 화면 → "+" 버튼 (FAB)
   - 과목명, 목표 점수 입력
   - API: `POST /api/grades`

3. **성적 확인**
   - 3개 이상 과목: 방사형 그래프 표시
   - 2개 이하 과목: 박스 형태 UI 표시
   - 목표 점수와 현재 점수 비교

4. **점수 업데이트**
   - 과목 목록에서 점수 입력
   - "저장" 버튼 클릭 시 API 호출
   - API: `PUT /api/grades/:id`

### 시나리오 3: 포모도로 타이머 사용

1. **설정**
   - 포모도로 탭 → 설정 버튼
   - 공부 시간: 25분, 휴식 시간: 5분 설정
   - API: `PUT /api/pomodoro/settings`

2. **세션 시작**
   - "공부 시작" 버튼 클릭
   - API: `POST /api/pomodoro/sessions`
   - 로컬 타이머 시작 (AsyncStorage 저장)

3. **세션 완료**
   - 시간 종료 시 알림 표시
   - 자동으로 휴식 모드 전환
   - API: `PUT /api/pomodoro/sessions/:id/complete`

4. **통계 확인**
   - 오늘 완료한 세션 수 확인
   - 총 공부 시간 확인

## 📋 체크리스트: 새 개발자 온보딩

프로젝트를 시작하기 전 확인사항:

- [ ] Node.js 18+ 설치 확인
- [ ] Yarn 설치 확인
- [ ] Expo CLI 설치 확인 (`npm install -g expo-cli`)
- [ ] Git 저장소 클론 완료
- [ ] 의존성 설치 완료 (`yarn install`)
- [ ] 환경 변수 설정 완료 (`.env`, `server/.env`)
- [ ] Supabase 프로젝트 생성 및 데이터베이스 초기화 완료
- [ ] 서버 실행 확인 (`cd server && yarn dev`)
- [ ] 클라이언트 실행 확인 (`yarn start`)
- [ ] 로그인/회원가입 테스트 완료
- [ ] README.md 전체 읽기 완료
- [ ] `server/README.md` 읽기 완료

## 🔗 기능 간 연동

### 공부 시간 통합

**그룹챗 공부** ↔ **포모도로 타이머** ↔ **통계 탭**

- 그룹챗에서 공부 시작 시 포모도로 세션도 함께 생성
- AsyncStorage로 세션 정보 공유
- 모든 공부 시간이 통계 탭에 통합 표시

**데이터 흐름**:
```
그룹챗 "공부 시작"
    ↓
study_sessions 테이블 (그룹 공부)
    ↓
pomodoro_sessions 테이블 (개인 타이머)
    ↓
AsyncStorage (세션 정보 공유)
    ↓
통계 API 조회 시 두 테이블 모두 집계
```

### 알림 연동

- 그룹챗/포모도로에서 공부 시작 시 상태바 알림 표시
- 공부 종료 시 알림 제거
- `expo-notifications` 사용

### 다국어 연동

- 모든 사용자 텍스트는 `i18n` 사용
- `useTranslation()` 훅으로 번역 가져오기
- 번역 파일: `i18n/locales/ko.ts`, `en.ts`

## 📂 주요 파일 위치 가이드

### 특정 기능을 찾을 때

**인증 관련**:
- 화면: `app/(auth)/login.tsx`, `signup.tsx`
- Context: `contexts/AuthContext.tsx`
- API: `server/src/routes/authRoutes.ts`
- 서비스: `server/src/services/authService.ts`

**그룹 관리**:
- 화면: `app/groups/create.tsx`, `app/(tabs)/explore.tsx`
- Context: `contexts/GroupContext.tsx`
- API: `server/src/routes/groupRoutes.ts`
- 서비스: `server/src/services/groupService.ts`

**채팅**:
- 화면: `app/chat/[groupId].tsx`
- Socket 핸들러: `server/src/socket/socketHandler.ts`
- API: `server/src/routes/messageRoutes.ts`

**공부 세션**:
- Socket 이벤트: `constants/socket.ts`
- Socket 핸들러: `server/src/socket/socketHandler.ts`
- 서비스: `server/src/services/studyService.ts`
- Repository: `server/src/repositories/studyRepository.ts`

**포모도로**:
- 화면: `app/(tabs)/pomodoro.tsx`
- API: `server/src/routes/pomodoroRoutes.ts`
- 서비스: `server/src/services/pomodoroService.ts`

**성적표**:
- 화면: `app/(tabs)/grades.tsx`, `app/grades/[examId]/subjects.tsx`
- 컴포넌트: `components/RadarChart.tsx`
- API: `server/src/routes/gradeRoutes.ts`

**통계**:
- 화면: `app/(tabs)/stats.tsx`
- 컴포넌트: `components/LineChart.tsx`
- API: `server/src/routes/statsRoutes.ts`

### 공통 컴포넌트

- **차트**: `components/RadarChart.tsx`, `components/LineChart.tsx`
- **랭킹**: `components/RankingChip.tsx`
- **타이머**: `components/TimerGauge.tsx`, `components/CircularProgress.tsx`
- **입력**: `components/Input.tsx`, `components/DatePicker.tsx`
- **로딩**: `components/BlockingLoader.tsx`

### 유틸리티

- **API 클라이언트**: `utils/apiClient.ts`
- **Socket 클라이언트**: `utils/socketClient.ts`

### 설정 파일

- **API 엔드포인트**: `config/api.ts`
- **Socket 이벤트**: `constants/socket.ts`
- **색상 테마**: `constants/colors.ts`
- **저장소 키**: `constants/storage.ts`

## 🚀 빠른 참조

### 자주 사용하는 명령어

```bash
# 개발 서버 시작
yarn start                    # 클라이언트
cd server && yarn dev         # 서버

# 린트 및 포맷팅
yarn lint                     # 전체 린트
yarn lint:fix                 # 자동 수정
yarn format                   # 포맷팅

# Git Flow
yarn gf:start feature-name    # 기능 브랜치 시작
yarn gf:release 0.1.0        # 릴리스 브랜치 시작
yarn gf:finish 0.1.0         # 릴리스 완료

# 빌드
cd server && yarn build       # 서버 빌드
eas build --platform ios      # iOS 빌드
```

### 자주 사용하는 코드 패턴

**API 호출**:
```typescript
const data = await apiFetch<ResponseType>(getApiUrl('/api/endpoint'), {
  method: 'GET',
  requireAuth: true,
});
```

**Socket 이벤트 전송**:
```typescript
socket.emit(clientToServerEvents.eventName, payload);
```

**Socket 이벤트 수신**:
```typescript
socket.on(serverToClientEvents.eventName, (data) => {
  // 처리 로직
});
```

**Context 사용**:
```typescript
const { user } = useAuth();
const { isDark, themeColors } = useTheme();
```

**다국어 사용**:
```typescript
const { t } = useTranslation();
<Text>{t('common.save')}</Text>
```

## 📄 라이선스

Private
