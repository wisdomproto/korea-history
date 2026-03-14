import { StyleSheet, View, Platform } from 'react-native';

export default function NotesScreen() {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe
          src="/summary-notes.html"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          } as any}
          title="한국사 요약노트"
        />
      </View>
    );
  }

  // Native fallback (future: WebView)
  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
