import groupRepository from '../repositories/groupRepository';
import userRepository from '../repositories/userRepository';
import { StudyGroup, CreateGroupRequest, GroupWithMembers } from '../types';

class GroupService {
  // 그룹 생성 + 소유자 자동 추가
  async createGroup(userId: string, groupData: CreateGroupRequest): Promise<StudyGroup> {
    try {
      // 1. 그룹 생성
      const group = await groupRepository.createGroup(userId, groupData);

      // 2. 소유자를 멤버로 자동 추가 (role: 'owner')
      await groupRepository.addMember(group.id, userId, 'owner');

      return group;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  // 사용자 그룹 목록 조회
  async getUserGroups(userId: string): Promise<StudyGroup[]> {
    try {
      return await groupRepository.getUserGroups(userId);
    } catch (error) {
      console.error('Error fetching user groups:', error);
      throw error;
    }
  }

  // 그룹 상세 조회 (멤버 포함)
  async getGroupById(groupId: string, userId: string): Promise<GroupWithMembers | null> {
    try {
      const group = await groupRepository.getGroupById(groupId);
      if (!group) return null;

      // 멤버인지 확인
      const isMember = await groupRepository.isMember(groupId, userId);
      if (!isMember) {
        throw new Error('그룹 멤버만 조회할 수 있습니다.');
      }

      const members = await groupRepository.getGroupMembers(groupId);

      return {
        ...group,
        members,
        memberCount: members.length,
      };
    } catch (error) {
      console.error('Error fetching group:', error);
      throw error;
    }
  }

  // 이메일로 멤버 초대
  async inviteMember(groupId: string, inviterId: string, inviteeEmail: string): Promise<void> {
    try {
      // 1. 그룹 존재 확인
      const group = await groupRepository.getGroupById(groupId);
      if (!group) {
        throw new Error('그룹을 찾을 수 없습니다.');
      }

      // 2. 초대하는 사람이 멤버인지 확인
      const inviterRole = await groupRepository.getMemberRole(groupId, inviterId);
      if (!inviterRole) {
        throw new Error('그룹 멤버만 초대할 수 있습니다.');
      }

      // 3. 초대받는 사용자 조회
      const invitee = await userRepository.getUserByEmail(inviteeEmail);
      if (!invitee) {
        throw new Error('해당 이메일의 사용자를 찾을 수 없습니다.');
      }

      // 4. 이미 멤버인지 확인
      const isAlreadyMember = await groupRepository.isMember(groupId, invitee.user_id);
      if (isAlreadyMember) {
        throw new Error('이미 그룹 멤버입니다.');
      }

      // 5. 멤버 추가
      await groupRepository.addMember(groupId, invitee.user_id, 'member');
    } catch (error) {
      console.error('Error inviting member:', error);
      throw error;
    }
  }

  // 그룹 나가기
  async leaveGroup(groupId: string, userId: string): Promise<void> {
    try {
      // 1. 그룹 존재 확인
      const group = await groupRepository.getGroupById(groupId);
      if (!group) {
        throw new Error('그룹을 찾을 수 없습니다.');
      }

      // 2. 소유자는 나갈 수 없음
      if (group.owner_id === userId) {
        throw new Error(
          '그룹 소유자는 그룹을 나갈 수 없습니다. 그룹을 삭제하거나 소유권을 양도하세요.'
        );
      }

      // 3. 멤버인지 확인
      const isMember = await groupRepository.isMember(groupId, userId);
      if (!isMember) {
        throw new Error('그룹 멤버가 아닙니다.');
      }

      // 4. 멤버 제거
      await groupRepository.removeMember(groupId, userId);
    } catch (error) {
      console.error('Error leaving group:', error);
      throw error;
    }
  }

  // 그룹 삭제 (소유자만)
  async deleteGroup(groupId: string, userId: string): Promise<void> {
    try {
      // 1. 그룹 존재 확인
      const group = await groupRepository.getGroupById(groupId);
      if (!group) {
        throw new Error('그룹을 찾을 수 없습니다.');
      }

      // 2. 소유자인지 확인
      if (group.owner_id !== userId) {
        throw new Error('그룹 소유자만 삭제할 수 있습니다.');
      }

      // 3. 그룹 삭제 (CASCADE로 멤버도 자동 삭제됨)
      await groupRepository.deleteGroup(groupId);
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  }
}

export default new GroupService();
