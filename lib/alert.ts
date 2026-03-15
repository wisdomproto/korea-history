/**
 * Cross-platform alert utilities.
 * React Native's Alert.alert doesn't fire callbacks properly on web,
 * so we use window.alert/confirm directly on web.
 */
import { Alert, Platform } from 'react-native';

/** Show a simple alert (no callback). */
export function showAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(message);
  } else {
    Alert.alert(title, message);
  }
}

/** Show a confirm dialog. Returns true if confirmed (on web), or calls onConfirm (native). */
export function showConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText = '확인',
  cancelText = '취소',
) {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel' },
      { text: confirmText, onPress: onConfirm },
    ]);
  }
}

/** Show an alert with a single OK button + callback. */
export function showAlertWithCallback(title: string, message: string, onOk: () => void) {
  if (Platform.OS === 'web') {
    window.alert(message);
    onOk();
  } else {
    Alert.alert(title, message, [{ text: '확인', onPress: onOk }]);
  }
}

/**
 * Show a 3-option dialog (e.g., "처음부터" / "이어서" / "취소").
 * On web, uses confirm with option1 on OK, option2 text as alternate prompt.
 */
export function showThreeOption(
  title: string,
  message: string,
  options: {
    option1: { text: string; onPress: () => void };
    option2: { text: string; onPress: () => void };
    cancel?: { text: string };
  },
) {
  if (Platform.OS === 'web') {
    const choice = window.confirm(`${message}\n\nOK: ${options.option1.text}\nCancel: ${options.option2.text}`);
    if (choice) {
      options.option1.onPress();
    } else {
      options.option2.onPress();
    }
  } else {
    Alert.alert(title, message, [
      { text: options.option1.text, onPress: options.option1.onPress },
      { text: options.option2.text, onPress: options.option2.onPress },
      { text: options.cancel?.text ?? '취소', style: 'cancel' },
    ]);
  }
}
