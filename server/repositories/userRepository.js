const supabase = require('../src/supabaseClient');

class UserRepository {
  // 사용자 프로필 생성
  async createUserProfile(userId, userData) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert([
          {
            user_id: userId,
            email: userData.email,
            display_name: userData.displayName,
            avatar: userData.avatar,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  // 사용자 프로필 조회
  async getUserProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116: no rows found
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  // 사용자 프로필 업데이트
  async updateUserProfile(userId, updateData) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // 이메일로 사용자 조회
  async getUserByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw error;
    }
  }
}

module.exports = new UserRepository();
