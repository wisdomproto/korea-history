import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '@/lib/constants';

interface Props {
  formattedTime: string;
  isWarning: boolean;
  progress: number;
}

export default function Timer({ formattedTime, isWarning, progress }: Props) {
  return (
    <View style={styles.container}>
      <View style={[styles.chip, isWarning && styles.chipWarning]}>
        <Ionicons
          name="time-outline"
          size={16}
          color={isWarning ? '#fff' : '#fff'}
        />
        <Text style={styles.time}>
          {formattedTime}
        </Text>
      </View>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress * 100}%` },
            isWarning && styles.progressWarning,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 8,
  },
  chipWarning: {
    backgroundColor: COLORS.danger,
  },
  time: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  progressWarning: {
    backgroundColor: COLORS.danger,
  },
});
