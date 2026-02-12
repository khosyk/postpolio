import messageRepository from '../repositories/messageRepository';
import groupRepository from '../repositories/groupRepository';
import userRepository from '../repositories/userRepository';
import { Message } from '../types';

class MessageService {
  // 메시지 생성
  async createMessage(groupId: string, userId: string, text: string): Promise<Message> {
    try {
      // 1. 그룹 존재 확인
      const group = await groupRepository.getGroupById(groupId);
      if (!group) {
        throw new Error('그룹을 찾을 수 없습니다.');
      }

      // 2. 그룹 멤버인지 확인
      const isMember = await groupRepository.isMember(groupId, userId);
      if (!isMember) {
        throw new Error('그룹 멤버만 메시지를 전송할 수 있습니다.');
      }

      // 3. 사용자 프로필 조회 (displayName, avatar)
      const profile = await userRepository.getUserProfile(userId);
      if (!profile) {
        throw new Error('사용자 프로필을 찾을 수 없습니다.');
      }

      // 4. 메시지 생성
      const dbMessage = await messageRepository.createMessage(groupId, userId, text);

      // 5. Message 타입으로 변환
      return {
        id: dbMessage.id,
        text: dbMessage.text,
        userId: dbMessage.user_id,
        displayName: profile.nickname || profile.email.split('@')[0],
        avatar: profile.avatar,
        createdAt: dbMessage.created_at,
        type: 'message',
      };
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }

  // 그룹 메시지 목록 조회
  async getGroupMessages(
    groupId: string,
    userId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<Message[]> {
    try {
      // 1. 그룹 존재 확인
      const group = await groupRepository.getGroupById(groupId);
      if (!group) {
        throw new Error('그룹을 찾을 수 없습니다.');
      }

      // 2. 그룹 멤버인지 확인
      const isMember = await groupRepository.isMember(groupId, userId);
      if (!isMember) {
        throw new Error('그룹 멤버만 메시지를 조회할 수 있습니다.');
      }

      // 3. 메시지 목록 조회
      const dbMessages = await messageRepository.getGroupMessages(groupId, limit, offset);

      // 4. 사용자 프로필 조회 (일괄)
      const userIds = [...new Set(dbMessages.map(m => m.user_id))];
      const profiles = await Promise.all(userIds.map(id => userRepository.getUserProfile(id)));
      const profileMap = new Map(profiles.filter(p => p !== null).map(p => [p!.user_id, p!]));

      // 5. Message 타입으로 변환
      return dbMessages.map(dbMsg => {
        const profile = profileMap.get(dbMsg.user_id);
        return {
          id: dbMsg.id,
          text: dbMsg.text,
          userId: dbMsg.user_id,
          displayName: profile?.nickname || profile?.email.split('@')[0] || '알 수 없음',
          avatar: profile?.avatar,
          createdAt: dbMsg.created_at,
          type: 'message' as const,
        };
      });
    } catch (error) {
      console.error('Error fetching group messages:', error);
      throw error;
    }
  }
}

export default new MessageService();
