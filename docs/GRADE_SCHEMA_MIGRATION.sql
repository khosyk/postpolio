-- GRADE_SCHEMA_MIGRATION.sql
-- 점수 의미에 맞게 grade_records 제약 조건을 재정의한다.
-- - current_score: 실제 받은 점수
-- - max_score: 시험에서 받을 수 있는 최대 점수(만점)
-- - target_score: 목표 점수
-- 관계:
--   0 <= current_score <= max_score
--   0 <= target_score <= max_score
--   max_score <= 1000 (별도 애플리케이션 레벨에서 검증)

BEGIN;

-- 기존 제약 조건 제거
ALTER TABLE public.grade_records
  DROP CONSTRAINT IF EXISTS grade_records_current_score_check,
  DROP CONSTRAINT IF EXISTS grade_records_target_score_check;

-- 현재 점수: 0 이상, 만점 이하
ALTER TABLE public.grade_records
  ADD CONSTRAINT grade_records_current_score_check
  CHECK (
    current_score IS NULL
    OR (current_score >= 0 AND current_score <= max_score)
  );

-- 목표 점수: 0 이상, 만점 이하 (애플리케이션에서 별도로 1000 상한 검증)
ALTER TABLE public.grade_records
  ADD CONSTRAINT grade_records_target_score_check
  CHECK (
    target_score IS NULL
    OR (target_score >= 0 AND target_score <= max_score)
  );

COMMIT;

