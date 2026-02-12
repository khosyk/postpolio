#!/bin/bash

# PostPolio API 테스트 스크립트
# 사용법: ./test-api.sh

BASE_URL="http://localhost:4000"
EMAIL="test$(date +%s)@example.com"
PASSWORD="password123"
DISPLAY_NAME="테스트 사용자"

echo "=========================================="
echo "PostPolio API 테스트 시작"
echo "=========================================="
echo ""

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 서버 연결 확인
echo "1. 서버 연결 확인..."
if curl -s "$BASE_URL/" > /dev/null; then
  echo -e "${GREEN}✓ 서버 연결 성공${NC}"
else
  echo -e "${RED}✗ 서버 연결 실패 - 서버가 실행 중인지 확인하세요${NC}"
  exit 1
fi
echo ""

# Step 1: 회원가입
echo "2. 회원가입 테스트..."
SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"displayName\": \"$DISPLAY_NAME\",
    \"avatar\": \"😀\"
  }")

echo "$SIGNUP_RESPONSE" | jq '.' 2>/dev/null || echo "$SIGNUP_RESPONSE"

if echo "$SIGNUP_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ 회원가입 성공${NC}"
else
  echo -e "${YELLOW}⚠ 회원가입 실패 또는 이미 존재하는 이메일${NC}"
fi
echo ""

# Step 2: 로그인
echo "3. 로그인 테스트..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"

# 토큰 추출
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken' 2>/dev/null)

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" == "null" ]; then
  echo -e "${RED}✗ 로그인 실패: 토큰을 받을 수 없습니다${NC}"
  echo ""
  echo "응답 전체:"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ 로그인 성공${NC}"
echo "Access Token: ${ACCESS_TOKEN:0:50}..."
echo ""

# Step 3: 그룹 생성
echo "4. 그룹 생성 테스트..."
GROUP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/groups" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "name": "테스트 스터디 그룹",
    "description": "API 테스트용 그룹입니다"
  }')

echo "$GROUP_RESPONSE" | jq '.' 2>/dev/null || echo "$GROUP_RESPONSE"

# 그룹 ID 추출
GROUP_ID=$(echo "$GROUP_RESPONSE" | jq -r '.data.group.id' 2>/dev/null)

if [ -z "$GROUP_ID" ] || [ "$GROUP_ID" == "null" ]; then
  echo -e "${RED}✗ 그룹 생성 실패${NC}"
  exit 1
fi

echo -e "${GREEN}✓ 그룹 생성 성공${NC}"
echo "Group ID: $GROUP_ID"
echo ""

# Step 4: 그룹 목록 조회
echo "5. 그룹 목록 조회 테스트..."
GROUPS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/groups" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$GROUPS_RESPONSE" | jq '.' 2>/dev/null || echo "$GROUPS_RESPONSE"

if echo "$GROUPS_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ 그룹 목록 조회 성공${NC}"
else
  echo -e "${RED}✗ 그룹 목록 조회 실패${NC}"
fi
echo ""

# Step 5: 그룹 상세 조회
echo "6. 그룹 상세 조회 테스트..."
GROUP_DETAIL_RESPONSE=$(curl -s -X GET "$BASE_URL/api/groups/$GROUP_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$GROUP_DETAIL_RESPONSE" | jq '.' 2>/dev/null || echo "$GROUP_DETAIL_RESPONSE"

if echo "$GROUP_DETAIL_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ 그룹 상세 조회 성공${NC}"
else
  echo -e "${RED}✗ 그룹 상세 조회 실패${NC}"
fi
echo ""

# Step 6: 그룹 설정 변경
echo "7. 그룹 설정 변경 테스트..."
SETTINGS_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/groups/$GROUP_ID/settings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "chat_enabled": false,
    "check_in_interval": 45
  }')

echo "$SETTINGS_RESPONSE" | jq '.' 2>/dev/null || echo "$SETTINGS_RESPONSE"

if echo "$SETTINGS_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ 그룹 설정 변경 성공${NC}"
else
  echo -e "${RED}✗ 그룹 설정 변경 실패${NC}"
fi
echo ""

# Step 7: 토큰 검증
echo "8. 토큰 검증 테스트..."
VERIFY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/verify" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{
    \"token\": \"$ACCESS_TOKEN\"
  }")

echo "$VERIFY_RESPONSE" | jq '.' 2>/dev/null || echo "$VERIFY_RESPONSE"

if echo "$VERIFY_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ 토큰 검증 성공${NC}"
else
  echo -e "${RED}✗ 토큰 검증 실패${NC}"
fi
echo ""

echo "=========================================="
echo -e "${GREEN}테스트 완료!${NC}"
echo "=========================================="

