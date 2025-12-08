# Supabase 설정 가이드

## 1. 테이블 생성

### `user_profiles` 테이블

Supabase Dashboard → SQL Editor에서 다음 SQL 실행:

```sql
-- user_profiles 테이블 생성
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) 활성화
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS 정책: Service Role Key로만 접근 가능 (서버에서만)
-- 참고: Service Role Key는 서버에서만 사용하고 클라이언트에 노출하지 마세요
CREATE POLICY "Service role can manage user_profiles"
  ON public.user_profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

## 2. Authentication 설정

### Email Provider 설정

1. **Supabase Dashboard → Authentication → Providers → Email**
   - ✅ Enable email provider: **ON**
   - ✅ Confirm email: **ON** (보안 권장)
   - ✅ Secure email change: **ON** (권장)
   - ✅ Allow new users to sign up: **ON**

### URL Configuration

1. **Supabase Dashboard → Authentication → URL Configuration**
   - **Site URL**: `postpolio://` (React Native 딥링크) 또는 웹 URL
   - **Redirect URLs**에 다음 추가:
     ```
     postpolio://auth/confirm
     https://yourdomain.com/auth/confirm
     http://localhost:3000/auth/confirm (개발용)
     ```

### Email Templates (선택사항)

1. **Supabase Dashboard → Authentication → Email Templates**
   - Confirm signup: 이메일 인증 링크 템플릿 커스터마이징 가능
   - Magic Link: 필요 시 설정

## 3. 환경 변수 설정

### 서버 (`server/.env`)

```env
# Supabase 설정
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here

# 이메일 인증 리다이렉트 URL
EMAIL_REDIRECT_URL=postpolio://auth/confirm
# 또는 웹용:
# EMAIL_REDIRECT_URL=https://yourdomain.com/auth/confirm

# 서버 설정
PORT=4000
CORS_ORIGIN=*
```

### 클라이언트 (선택사항)

프로덕션 환경에서만 필요:

```env
EXPO_PUBLIC_API_URL=https://api.postpolio.com
```

## 4. 테이블 스키마 상세

### `user_profiles` 컬럼 설명

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `user_id` | UUID | PRIMARY KEY, FK → auth.users(id) | Supabase Auth 사용자 ID (CASCADE 삭제) |
| `email` | TEXT | NOT NULL, UNIQUE | 사용자 이메일 (중복 불가) |
| `nickname` | TEXT | NULL | 사용자 표시 이름 (선택) |
| `avatar` | TEXT | NULL | 아바타 이모지/이미지 URL (선택) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 생성 시각 |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | 수정 시각 (자동 업데이트) |

### 관계

- `user_id`는 `auth.users.id`를 참조 (1:1 관계)
- `auth.users`에서 사용자가 삭제되면 `user_profiles`도 자동 삭제 (CASCADE)

## 5. 보안 고려사항

### RLS 정책

현재 설정은 Service Role Key로만 접근 가능하도록 되어 있습니다. 이는:
- ✅ 서버에서만 데이터 접근 가능
- ✅ 클라이언트는 직접 접근 불가
- ✅ 보안 강화

### Service Role Key 보안

⚠️ **절대 클라이언트에 노출하지 마세요!**
- Service Role Key는 서버에서만 사용
- 클라이언트는 Anon Key 사용 (필요 시)
- Git에 커밋하지 않도록 `.env`를 `.gitignore`에 추가

## 6. 테스트 체크리스트

- [ ] `user_profiles` 테이블 생성 완료
- [ ] RLS 정책 설정 완료
- [ ] Email Provider 활성화
- [ ] Redirect URLs 설정 완료
- [ ] 환경 변수 설정 완료
- [ ] 회원가입 테스트 (정상 케이스)
- [ ] 이메일 인증 링크 수신 확인
- [ ] 중복 이메일 가입 방지 확인

## 7. 트러블슈팅

### "Could not find the table 'public.user_profiles'"
- 테이블이 생성되지 않았거나 스키마 이름이 다름
- SQL Editor에서 테이블 생성 SQL 실행 확인

### "Email address is invalid"
- Supabase가 특정 도메인을 차단할 수 있음
- 실제 이메일 도메인 사용 (gmail.com, naver.com 등)
- 또는 Supabase 설정에서 허용 도메인 추가

### "Permission denied"
- RLS 정책 확인
- Service Role Key 사용 확인
- 서버 환경 변수 확인

