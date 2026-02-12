/**
 * Socket.IO 이벤트명 상수 정의
 * 클라이언트와 서버 간 통신에 사용하는 이벤트명을 중앙에서 관리합니다.
 *
 * 재사용 가능성: ⭐⭐⭐⭐
 * Socket.IO를 사용하는 다른 프로젝트에서 참고 가능
 */

/**
 * 클라이언트 → 서버 이벤트
 */
export const clientToServerEvents = {
  // 채팅 관련
  join: 'join',
  message: 'message',
  leave: 'leave',

  // 공부 세션 관련
  studyStart: 'study:start',
  studyStop: 'study:stop',
  studyCheckInRequest: 'study:checkin:request',
  studyCheckInSubmit: 'study:checkin:submit',
  studyStatus: 'study:status',
  studyHeartbeat: 'study:heartbeat',
} as const;

/**
 * 서버 → 클라이언트 이벤트
 */
export const serverToClientEvents = {
  // 채팅 관련
  joined: 'joined',
  message: 'message',
  system: 'system',
  error: 'error',

  // 공부 세션 관련
  studyCheckInRequest: 'study:checkin:request',
  studyCheckInComplete: 'study:checkin:complete',
  studyRankingUpdate: 'study:ranking:update',
  studyTimeUpdate: 'study:time:update',
  studyMembersTimeUpdate: 'study:members:time:update',
  alert: 'alert',
} as const;

/**
 * Socket 이벤트 타입
 */
export type ClientToServerEvent = (typeof clientToServerEvents)[keyof typeof clientToServerEvents];
export type ServerToClientEvent = (typeof serverToClientEvents)[keyof typeof serverToClientEvents];
