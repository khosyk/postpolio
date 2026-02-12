#!/bin/bash

# PostPolio 전체 API 테스트 스크립트

BASE_URL="http://localhost:4000"
EMAIL="test$(date +%s)@example.com"
PASSWORD="Test123!@#"
DISPLAY_NAME="테스트 사용자"

echo "=========================================="
echo "PostPolio 전체 API 테스트"
echo "=========================================="
echo ""

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 서버 연결 확인
echo "1. 서버 연결 확인..."
if curl -s "$BASE_URL/" > /dev/null; then
  echo -e "${GREEN}✓ 서버 연결 성공${NC}"
else
  echo -e "${RED}✗ 서버 연결 실패${NC}"
  exit 1
fi
echo ""

# 회원가입
echo "2. 회원가입..."
SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"displayName\": \"$DISPLAY_NAME\",
    \"avatar\": \"😀\"
  }")

if echo "$SIGNUP_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ 회원가입 성공${NC}"
else
  echo -e "${YELLOW}⚠ 회원가입 실패 또는 이미 존재${NC}"
fi
echo ""

# 로그인
echo "3. 로그인..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}✗ 로그인 실패${NC}"
  exit 1
fi

echo -e "${GREEN}✓ 로그인 성공${NC}"
echo ""

# 그룹 생성
echo "4. 그룹 생성..."
GROUP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/groups" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "name": "테스트 그룹",
    "description": "테스트용"
  }')

GROUP_ID=$(echo "$GROUP_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$GROUP_ID" ]; then
  echo -e "${RED}✗ 그룹 생성 실패${NC}"
  exit 1
fi

echo -e "${GREEN}✓ 그룹 생성 성공${NC}"
echo ""

# 성적표 생성
echo "5. 성적표 생성..."
GRADE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/grades" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "subject_name": "수학",
    "target_score": 90,
    "current_score": 85,
    "exam_name": "중간고사",
    "exam_date": "2024-12-15"
  }')

if echo "$GRADE_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ 성적표 생성 성공${NC}"
  GRADE_ID=$(echo "$GRADE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
else
  echo -e "${RED}✗ 성적표 생성 실패${NC}"
  echo "$GRADE_RESPONSE"
fi
echo ""

# 성적표 목록 조회
echo "6. 성적표 목록 조회..."
GRADES_LIST=$(curl -s -X GET "$BASE_URL/api/grades" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$GRADES_LIST" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ 성적표 목록 조회 성공${NC}"
else
  echo -e "${RED}✗ 성적표 목록 조회 실패${NC}"
fi
echo ""

# 포모도로 세션 생성
echo "7. 포모도로 세션 생성..."
POMODORO_RESPONSE=$(curl -s -X POST "$BASE_URL/api/pomodoro/sessions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "type": "study",
    "duration_minutes": 25
  }')

if echo "$POMODORO_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ 포모도로 세션 생성 성공${NC}"
  POMODORO_ID=$(echo "$POMODORO_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
else
  echo -e "${RED}✗ 포모도로 세션 생성 실패${NC}"
  echo "$POMODORO_RESPONSE"
fi
echo ""

# 포모도로 세션 목록 조회
echo "8. 포모도로 세션 목록 조회..."
POMODORO_LIST=$(curl -s -X GET "$BASE_URL/api/pomodoro/sessions" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$POMODORO_LIST" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ 포모도로 세션 목록 조회 성공${NC}"
else
  echo -e "${RED}✗ 포모도로 세션 목록 조회 실패${NC}"
fi
echo ""

# 통계 조회
echo "9. 통계 조회..."
TODAY=$(date +%Y-%m-%d)
STATS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/stats/daily?startDate=$TODAY&endDate=$TODAY" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$STATS_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ 통계 조회 성공${NC}"
else
  echo -e "${YELLOW}⚠ 통계 조회 실패 (데이터 없을 수 있음)${NC}"
fi
echo ""

# 요약 통계 조회
echo "10. 요약 통계 조회..."
SUMMARY_RESPONSE=$(curl -s -X GET "$BASE_URL/api/stats/summary" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$SUMMARY_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ 요약 통계 조회 성공${NC}"
else
  echo -e "${YELLOW}⚠ 요약 통계 조회 실패 (데이터 없을 수 있음)${NC}"
fi
echo ""

echo "=========================================="
echo -e "${GREEN}전체 API 테스트 완료!${NC}"
echo "=========================================="

