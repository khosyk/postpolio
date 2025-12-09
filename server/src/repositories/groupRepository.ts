import supabase from '../supabaseClient';
import { StudyGroup, GroupMember } from '../types';

class GroupRepository {
  // 그룹 생성
  async createGroup(
    ownerId: string,
    groupData: { name: string; description?: string }
  ): Promise<StudyGroup> {
    try {
      const { data, error } = await supabase
        .from('study_groups')
        .insert([
          {
            name: groupData.name,
            description: groupData.description || null,
            owner_id: ownerId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  // 그룹 ID로 조회
  async getGroupById(groupId: string): Promise<StudyGroup | null> {
    try {
      const { data, error } = await supabase
        .from('study_groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching group:', error);
      throw error;
    }
  }

  // 사용자의 그룹 목록 조회
  async getUserGroups(userId: string): Promise<StudyGroup[]> {
    try {
      // group_members에서 사용자의 그룹 ID 목록 조회
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      const groupIds = members.map((m: { group_id: string }) => m.group_id);

      // study_groups에서 해당 그룹들 조회
      const { data, error } = await supabase.from('study_groups').select('*').in('id', groupIds);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user groups:', error);
      throw error;
    }
  }

  // 그룹 멤버 추가
  async addMember(
    groupId: string,
    userId: string,
    role: 'owner' | 'admin' | 'member' = 'member'
  ): Promise<GroupMember> {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .insert([
          {
            group_id: groupId,
            user_id: userId,
            role,
            joined_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding member:', error);
      throw error;
    }
  }

  // 그룹 멤버 제거
  async removeMember(groupId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  }

  // 그룹 멤버 목록 조회
  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching group members:', error);
      throw error;
    }
  }

  // 그룹 삭제
  async deleteGroup(groupId: string): Promise<void> {
    try {
      const { error } = await supabase.from('study_groups').delete().eq('id', groupId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  }

  // 사용자가 그룹 멤버인지 확인
  async isMember(groupId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking membership:', error);
      throw error;
    }
  }

  // 사용자의 그룹 내 역할 조회
  async getMemberRole(
    groupId: string,
    userId: string
  ): Promise<'owner' | 'admin' | 'member' | null> {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data?.role || null;
    } catch (error) {
      console.error('Error fetching member role:', error);
      throw error;
    }
  }
}

export default new GroupRepository();
