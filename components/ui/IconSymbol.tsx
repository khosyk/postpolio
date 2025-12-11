import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

// Material Icons를 양 플랫폼에서 통일하여 사용하는 아이콘 컴포넌트
export const IconSymbol = ({
  name,
  size = 24,
  color,
  style,
}: {
  name: MaterialIconName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
}) => {
  return <MaterialIcons color={color} size={size} name={name} style={style} />;
};
