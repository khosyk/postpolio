# API 문서

## 기본 정보

- **개발 환경**: `http://localhost:4000`
- **프로덕션 환경**: `https://api.postpolio.com` (환경 변수 `EXPO_PUBLIC_API_URL`로 설정)

## Supabase 설정

### 환경 변수 (서버)

`server/.env` 파일에 다음 변수들을 설정하세요:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
EMAIL_REDIRECT_URL=postpolio://auth/confirm  # React Native 딥링크 또는 웹 URL
PORT=4000
CORS_ORIGIN=*
```

### Supabase Dashboard 설정

1. **Authentication → URL Configuration**
   - Redirect URLs에 다음 추가:
     - `postpolio://auth/confirm` (React Native 딥링크)
     - `https://yourdomain.com/auth/confirm` (웹용, 선택사항)

2. **Authentication → Providers → Email**
   - Enable email provider: ON
   - Confirm email: ON (보안 권장)
   - Secure email change: ON (권장)

## 인증 API

### 회원가입

**POST** `/api/auth/signup`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "사용자명 (선택)",
  "avatar": "👤 (선택)"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "회원가입이 완료되었습니다.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    },
    "profile": {
      "user_id": "uuid",
      "email": "user@example.com",
      "display_name": "사용자명",
      "avatar": "👤"
    }
  }
}
```

**참고:**
- 이메일 인증이 활성화된 경우, 사용자는 이메일로 전송된 인증 링크를 클릭해야 계정이 활성화됩니다.
- 인증 링크는 `EMAIL_REDIRECT_URL` 환경 변수에 설정된 URL로 리다이렉트됩니다.
- React Native 앱의 경우 딥링크(`postpolio://auth/confirm`)를 사용할 수 있습니다.

**에러 응답:**
- `400`: 요청 본문이 유효하지 않음 (Zod 검증 실패)
- `409`: 이미 등록된 이메일
- `500`: 서버 오류

---

### 로그인

**POST** `/api/auth/signin`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "로그인되었습니다.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    },
    "profile": {
      "user_id": "uuid",
      "email": "user@example.com",
      "display_name": "사용자명",
      "avatar": "👤"
    },
    "accessToken": "jwt_token"
  }
}
```

**에러 응답:**
- `400`: 요청 본문이 유효하지 않음
- `401`: 이메일 또는 비밀번호가 올바르지 않음
- `500`: 서버 오류

---

### 토큰 검증

**POST** `/api/auth/verify`

**Request Body:**
```json
{
  "token": "jwt_token"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    }
  }
}
```

**에러 응답:**
- `400`: 토큰이 필요함
- `401`: 유효하지 않은 토큰
- `500`: 서버 오류

---

### 프로필 업데이트

**PUT** `/api/auth/profile`

**Request Body:**
```json
{
  "userId": "uuid",
  "displayName": "새 사용자명 (선택)",
  "avatar": "😀 (선택)"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "프로필이 업데이트되었습니다.",
  "data": {
    "profile": {
      "user_id": "uuid",
      "email": "user@example.com",
      "display_name": "새 사용자명",
      "avatar": "😀"
    }
  }
}
```

**에러 응답:**
- `400`: 사용자 ID가 필요함
- `500`: 서버 오류

---

## 검증 규칙

### 공용 스키마 (Zod)

클라이언트와 서버에서 동일한 검증 규칙을 사용합니다.

**회원가입 스키마:**
- `email`: 이메일 형식 (필수)
- `password`: 최소 8자 (필수)
- `displayName`: 문자열 (선택)
- `avatar`: 문자열 (선택)

**로그인 스키마:**
- `email`: 이메일 형식 (필수)
- `password`: 최소 8자 (필수)

---

## 보안 고려사항

1. **클라이언트 검증**: 입력값 정규화 및 Zod 검증으로 불필요한 요청 차단
2. **서버 검증**: 모든 요청에 대해 서버에서 재검증 수행
3. **입력값 살균**: 제어문자 및 위험 특수문자 제거
4. **비밀번호**: 최소 8자, 대소문자 혼합, 숫자+특수문자 권장

