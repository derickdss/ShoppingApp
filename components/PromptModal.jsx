import React, { useState } from "react";
import {
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { COLORS } from "../styles/App.styles";

// Cross-platform replacement for the iOS-only Alert.prompt().
// Renders a small modal with a single text field.
export default function PromptModal({
  visible,
  title,
  placeholder = "",
  initial = "",
  confirmLabel = "Add",
  onConfirm,
  onCancel,
}) {
  const [value, setValue] = useState(initial);

  const handleConfirm = () => {
    onConfirm(value);
    setValue(initial);
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor="#999"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleConfirm}
          />
          <View style={styles.actions}>
            <TouchableOpacity onPress={onCancel} style={[styles.btn, styles.cancel]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} style={[styles.btn, styles.confirm]}>
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },
  title: { fontSize: 18, fontWeight: "bold", color: COLORS.text, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: "#F7F7FF",
    marginBottom: 16,
  },
  actions: { flexDirection: "row", justifyContent: "flex-end" },
  btn: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 18, marginHorizontal: 4 },
  cancel: { backgroundColor: "#EEE" },
  cancelText: { color: "#444", fontWeight: "bold" },
  confirm: { backgroundColor: COLORS.primary },
  confirmText: { color: "#fff", fontWeight: "bold" },
});
