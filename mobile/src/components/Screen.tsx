import { PropsWithChildren } from 'react';
import { ScrollView, StyleProp, ViewStyle } from 'react-native';
import { shared } from '@/theme';

export function Screen({ children, contentStyle }: PropsWithChildren<{ contentStyle?: StyleProp<ViewStyle> }>) {
  return (
    <ScrollView style={shared.screen} contentContainerStyle={[shared.content, contentStyle]} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}
