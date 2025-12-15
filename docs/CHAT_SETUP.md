# 채팅 메시지 데이터베이스 설정

## 그룹 메시지 테이블 생성

Supabase Dashboard → SQL Editor에서 다음 SQL 실행:

```sql
-- group_messages 테이블 생성
CREATE TABLE IF NOT EXISTS public.group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON public.group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON public.group_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_messages_user_id ON public.group_messages(user_id);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_group_messages_updated_at
  BEFORE UPDATE ON public.group_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- RLS 정책: Service Role Key로만 접근 가능
CREATE POLICY "Service role can manage group_messages"
  ON public.group_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

## 테이블 스키마 상세

### `group_messages` 컬럼 설명

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | UUID | PRIMARY KEY | 메시지 고유 ID |
| `group_id` | UUID | NOT NULL, FK → study_groups(id) | 그룹 ID (CASCADE 삭제) |
| `user_id` | UUID | NOT NULL, FK → user_profiles(user_id) | 작성자 사용자 ID |
| `text` | TEXT | NOT NULL | 메시지 내용 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 생성 시각 |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | 수정 시각 (자동 업데이트) |

### 관계

- `group_id`는 `study_groups.id`를 참조
- `user_id`는 `user_profiles.user_id`를 참조
- 그룹이 삭제되면 해당 그룹의 모든 메시지도 자동 삭제 (CASCADE)
- 사용자가 삭제되면 해당 사용자의 모든 메시지도 자동 삭제 (CASCADE)

