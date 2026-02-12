/**
 * 중앙화된 상수 관리
 * 모든 상수는 이 디렉토리에서 관리하며, 도메인별로 파일을 분리합니다.
 *
 * 사용 원칙:
 * 1. 하드코딩된 값은 모두 상수로 추출
 * 2. 타입 안전성 보장 (as const 사용)
 * 3. 환경별 설정은 config/ 디렉토리에서 관리
 * 4. 도메인별로 파일 분리
 */

// 색상 상수
export * from './colors';

// API 엔드포인트 (config/api.ts에서 관리)
// 이 파일에서는 API 관련 상수만 export

// AsyncStorage 키
export * from './storage';

// Socket.IO 이벤트명
export * from './socket';

// 유효성 검사 규칙
export * from './validation';

// 기타 상수
export * from './common';
