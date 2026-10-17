import { StyleSheet } from "react-native";

// Shared palette — same family as the Child Genius app (indigo/purple).
export const COLORS = {
  primary: "rgb(57, 61, 241)",
  header: "rgb(82, 82, 194)",
  bg: "#F3F0FF",
  card: "#FFFFFF",
  text: "#222",
  muted: "#666",
  accent: "#7E57C2",
  danger: "#E53935",
  green: "#4CAF50",
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.header,
  },
  primaryText: { color: COLORS.primary, fontWeight: "bold" },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  bigButton: {
    backgroundColor: COLORS.green,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  bigButtonText: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  input: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: "#F7F7FF",
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});

export default styles;
