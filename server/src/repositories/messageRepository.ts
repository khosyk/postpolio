import supabase from '../supabaseClient';

export interface GroupMessage {
  id: string;
  group_id: string;
  user_id: string;
  text: string;
  created_at: string;
  updated_at: string;
}

class MessageRepository {
  // 메시지 생성
  async createMessage(groupId: string, userId: string, text: string): Promise<GroupMessage> {
    try {
      const { data, error } = await supabase
        .from('group_messages')
        .insert([
          {
            group_id: groupId,
            user_id: userId,
            text,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }

  // 그룹 메시지 목록 조회 (최신순)
  async getGroupMessages(
    groupId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<GroupMessage[]> {
    try {
      const { data, error } = await supabase
        .from('group_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return (data || []).reverse(); // 최신순이지만 오래된 것부터 반환
    } catch (error) {
      console.error('Error fetching group messages:', error);
      throw error;
    }
  }

  // 메시지 ID로 조회
  async getMessageById(messageId: string): Promise<GroupMessage | null> {
    try {
      const { data, error } = await supabase
        .from('group_messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching message:', error);
      throw error;
    }
  }

  // 메시지 삭제
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('group_messages')
        .delete()
        .eq('id', messageId)
        .eq('user_id', userId); // 본인 메시지만 삭제 가능

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }
}

export default new MessageRepository();
