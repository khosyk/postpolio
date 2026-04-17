import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { colors, getThemeColors } from '@/constants/colors';

type AppModalBaseProps = {
  visible: boolean;
  onRequestClose: () => void;
  title: string;
  subtitle?: string;
  /** 본문 영역 (설명, 폼 등) */
  content?: React.ReactNode;
  /** 모달 카드 추가 스타일 */
  contentStyle?: ViewStyle;
  /** animationType. 기본: 'fade' */
  animationType?: 'fade' | 'slide' | 'none';
};

/** 버튼 없는 단순 정보 모달 */
interface AppModalSimpleProps extends AppModalBaseProps {
  type?: 'simple';
}

/** 확인만 있는 모달 */
interface AppModalConfirmProps extends AppModalBaseProps {
  type: 'confirm';
  confirmText?: string;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  confirmVariant?: 'primary' | 'danger';
}

/** 확인 / 취소가 있는 모달 */
interface AppModalConfirmCancelProps extends AppModalBaseProps {
  type: 'confirmCancel';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmDisabled?: boolean;
  confirmVariant?: 'primary' | 'danger';
}

export type AppModalProps = AppModalSimpleProps | AppModalConfirmProps | AppModalConfirmCancelProps;

/**
 * 앱 표준 모달.
 * - 반투명 백드롭, 중앙 카드(90% 너비, max 400), 제목/부제목, 테마 색상 적용.
 * - 백드롭 터치 시 onRequestClose 호출. 카드 터치 시 전파 중단.
 */
const AppModal = (props: AppModalProps) => {
  const {
    visible,
    onRequestClose,
    title,
    subtitle,
    content,
    contentStyle,
    animationType = 'fade',
  } = props;

  const { isDark } = useTheme();
  const theme = getThemeColors(isDark);

  return (
    <Modal
      transparent
      visible={visible}
      animationType={animationType}
      onRequestClose={onRequestClose}
    >
      <Pressable style={styles.backdrop} onPress={onRequestClose}>
        <Pressable onPress={e => e.stopPropagation()}>
          <View
            style={[
              styles.container,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
              },
              contentStyle,
            ]}
          >
            <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle != null && subtitle !== '' && (
              <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
            {content && <View style={styles.body}>{content}</View>}

            {/* 확인 / 취소 버튼 */}
            {props.type && props.type !== 'simple' && (
              <View style={styles.footer}>
                {props.type === 'confirmCancel' && (
                  <View style={styles.actionsRow}>
                    <Pressable
                      style={[
                        styles.actionButton,
                        styles.cancelButton,
                        { backgroundColor: theme.borderSecondary },
                      ]}
                      onPress={() => {
                        if ('onCancel' in props && props.onCancel) {
                          props.onCancel();
                        } else {
                          onRequestClose();
                        }
                      }}
                    >
                      <Text style={[styles.cancelText, { color: theme.textSecondary }]}>
                        {props.cancelText ?? '취소'}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.actionButton,
                        props.confirmVariant === 'danger'
                          ? styles.confirmDangerButton
                          : styles.confirmPrimaryButton,
                        props.confirmDisabled && styles.actionDisabled,
                      ]}
                      onPress={props.onConfirm}
                      disabled={props.confirmDisabled}
                    >
                      <Text style={styles.confirmText}>{props.confirmText ?? '확인'}</Text>
                    </Pressable>
                  </View>
                )}

                {props.type === 'confirm' && (
                  <View style={styles.actionsRow}>
                    <Pressable
                      style={[
                        styles.actionButton,
                        props.confirmVariant === 'danger'
                          ? styles.confirmDangerButton
                          : styles.confirmPrimaryButton,
                        props.confirmDisabled && styles.actionDisabled,
                      ]}
                      onPress={props.onConfirm}
                      disabled={props.confirmDisabled}
                    >
                      <Text style={styles.confirmText}>{props.confirmText ?? '확인'}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    // 중앙 알림 모달 규격: overlay rgba(0,0,0,0.5)
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    // Width 300~320, 좌우 여백 확보
    width: 320,
    maxWidth: '90%',
    borderRadius: 14,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  body: {
    marginTop: 16,
  },
  footer: {
    marginTop: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmPrimaryButton: {
    backgroundColor: colors.blue500,
  },
  confirmDangerButton: {
    backgroundColor: colors.red500,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    // 배경색은 theme.borderSecondary에서 동적으로 설정
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AppModal;
