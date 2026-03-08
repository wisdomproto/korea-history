import React from 'react';
import { View, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';
import { COLORS } from '@/lib/constants';

interface ContainerProps {
  children: React.ReactNode;
  /** Use ScrollView instead of View */
  scroll?: boolean;
  /** Additional style for the content wrapper */
  style?: ViewStyle;
  /** Background color override */
  backgroundColor?: string;
  /** Extra bottom padding for scroll content */
  bottomPadding?: number;
}

export function Container({
  children,
  scroll = false,
  style,
  backgroundColor = COLORS.background,
  bottomPadding = 32,
}: ContainerProps) {
  const { contentMaxWidth, contentPadding } = useResponsive();

  const contentStyle: ViewStyle = {
    maxWidth: contentMaxWidth,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: contentPadding,
    ...style,
  };

  if (scroll) {
    return (
      <ScrollView
        style={[styles.base, { backgroundColor }]}
        contentContainerStyle={[contentStyle, { paddingBottom: bottomPadding, paddingTop: 16, gap: 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.base, { backgroundColor }]}>
      <View style={[contentStyle, styles.flexFill, { paddingTop: 16, gap: 16 }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
  },
  flexFill: {
    flex: 1,
  },
});
