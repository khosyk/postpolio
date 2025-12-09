// 그룹 관련 타입 정의 (클라이언트용)
export interface StudyGroup {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
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
  members?: GroupMember[];
  memberCount?: number;
}
