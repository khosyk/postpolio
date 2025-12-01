import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  const nickname =
    // TODO: 서버 프로필 닉네임 연동 시 user.nickname으로 교체
    (user?.email && user.email.split('@')[0]) || '게스트';

  const avatar = nickname.charAt(0).toUpperCase();

  const handleLogout = async () => {
    setMenuVisible(false);
    await logout();
    router.replace('/(auth)');
  };

  const handleEditNickname = () => {
    // TODO: 닉네임 수정 화면/모달 연동
    setMenuVisible(false);
  };

  const handleEditIcon = () => {
    // TODO: 아이콘 수정 UI 연동
    setMenuVisible(false);
  };

  const handleWithdraw = () => {
    // TODO: 회원탈퇴 API 연동
    setMenuVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 헤더 영역 (약 30px 높이) */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PostPolio</Text>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => setMenuVisible(true)}
          accessibilityRole='button'
          accessibilityLabel='프로필 메뉴 열기'
        >
          <Text style={styles.profileAvatar}>{avatar}</Text>
        </TouchableOpacity>
      </View>

      {/* 홈 본문 - 간단한 환영 메시지 */}
      <View style={styles.content}>
        <Text style={styles.welcomeText}>
          <Text style={styles.welcomeNickname}>{nickname}</Text>
          <Text> 님 반갑습니다 👋</Text>
        </Text>
        <Text style={styles.welcomeSubText}>채팅 탭에서 대화를 시작해보세요.</Text>
      </View>

      {/* 프로필 메뉴 모달 */}
      <Modal
        transparent
        visible={menuVisible}
        animationType='fade'
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>프로필</Text>
            <Text style={styles.menuSubtitle}>{nickname}</Text>

            <View style={styles.menuSection}>
              <TouchableOpacity style={styles.menuItem} onPress={handleEditNickname}>
                <Text style={styles.menuItemText}>닉네임 수정</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={handleEditIcon}>
                <Text style={styles.menuItemText}>아이콘 수정</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.menuSection}>
              <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                <Text style={styles.menuItemText}>로그아웃</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.withdrawWrapper} onPress={handleWithdraw}>
              <Text style={styles.withdrawText}>회원탈퇴</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    minHeight: 30,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  profileButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatar: {
    color: '#F9FAFB',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  welcomeNickname: {
    fontWeight: '700',
    color: '#2563EB',
  },
  welcomeSubText: {
    fontSize: 14,
    color: '#6B7280',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    marginTop: 56,
    marginRight: 16,
    width: 220,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  menuSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#6B7280',
  },
  menuSection: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  menuItem: {
    paddingVertical: 8,
  },
  menuItemText: {
    fontSize: 14,
    color: '#111827',
  },
  withdrawWrapper: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  withdrawText: {
    fontSize: 13,
    color: '#DC2626',
    textDecorationLine: 'underline',
  },
});
