import { StyleSheet, View, Text } from 'react-native';
import { COLORS } from '@/lib/constants';

interface Props {
  formattedTime: string;
  isWarning: boolean;
  progress: number;
}

export default function Timer({ formattedTime, isWarning, progress }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.timerRow}>
        <Text style={styles.icon}>⏱</Text>
        <Text style={[styles.time, isWarning && styles.timeWarning]}>
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
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  icon: {
    fontSize: 14,
    marginRight: 6,
  },
  time: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  timeWarning: {
    color: COLORS.danger,
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
