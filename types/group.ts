// 그룹 관련 타입 정의 (클라이언트용)
export interface StudyGroup {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  chat_enabled: boolean;
  check_in_interval: number;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

export interface GroupWithMembers extends StudyGroup {
  members: GroupMember[];
  memberCount: number;
}

// 랭킹 관련 타입 (Phase 6)
export interface RankingEntry {
  userId: string;
  displayName: string;
  avatar: string;
  totalMinutes: number;
  rank: number;
}

// 그룹 멤버 공부시간 타입
export interface GroupMemberStudyTime {
  userId: string;
  displayName: string;
  avatar: string;
  totalMinutes: number;
}

// 그룹별 공부시간 요약 타입 (그룹 챗 탭용)
export interface GroupStudyTimeSummary {
  groupId: string;
  groupName: string;
  totalMinutes: number; // 그룹 전체 합계
  memberCount: number; // 멤버 수
  topMember?: GroupMemberStudyTime; // 1위 멤버 (선택적)
}
