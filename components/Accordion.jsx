import React, { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { COLORS } from "../styles/App.styles";

// One supermarket section. Collapsible header + a list of items you can add,
// tick off, and remove.
export default function Accordion({
  section,
  open,
  onToggle,
  onAddItem,
  onToggleItem,
  onRemoveItem,
  onRename,
}) {
  const [draft, setDraft] = useState("");
  const done = section.items.filter((i) => i.done).length;
  const total = section.items.length;

  const addItem = () => {
    const name = draft.trim();
    if (!name) return;
    onAddItem(name);
    setDraft("");
  };

  return (
    <View style={{ backgroundColor: "#fff", borderRadius: 14, marginBottom: 12, elevation: 2, overflow: "hidden" }}>
      {/* Header (tap to open/close) */}
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.8}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
          backgroundColor: open ? "#EEEBFF" : "#fff",
        }}
      >
        <Text style={{ fontSize: 22, marginRight: 10 }}>{section.emoji || "📦"}</Text>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: "bold", color: COLORS.text }}>
          {section.title}
        </Text>
        {total > 0 && (
          <Text style={{ color: done === total ? COLORS.green : COLORS.muted, fontWeight: "bold", marginRight: 8 }}>
            {done}/{total}
          </Text>
        )}
        <Text style={{ color: COLORS.primary, fontSize: 16 }}>
          {open ? "▲" : "▼"}
        </Text>
      </TouchableOpacity>

      {/* Body */}
      {open && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 14, borderTopWidth: 1, borderTopColor: "#EEE" }}>
          {total === 0 ? (
            <Text style={{ color: COLORS.muted, paddingVertical: 10, fontSize: 14 }}>
              Nothing here yet — add an item below.
            </Text>
          ) : (
            section.items.map((item) => (
              <View
                key={item.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: "#F0F0F0",
                }}
              >
                <TouchableOpacity
                  onPress={() => onToggleItem(item.id)}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: item.done ? COLORS.green : COLORS.primary,
                    backgroundColor: item.done ? COLORS.green : "transparent",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 12,
                  }}
                >
                  {item.done && <Text style={{ color: "#fff", fontSize: 16, lineHeight: 18 }}>✓</Text>}
                </TouchableOpacity>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: item.done ? "#999" : COLORS.text,
                    textDecorationLine: item.done ? "line-through" : "none",
                  }}
                >
                  {item.name}
                </Text>
                <TouchableOpacity onPress={() => onRemoveItem(item.id)} style={{ padding: 8 }}>
                  <Text style={{ color: COLORS.danger, fontSize: 18 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* Add item row */}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
            <TextInput
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: COLORS.primary,
                borderRadius: 10,
                padding: 10,
                fontSize: 16,
                backgroundColor: "#F7F7FF",
                color: COLORS.text,
              }}
              value={draft}
              onChangeText={setDraft}
              placeholder={`Add to ${section.title}…`}
              placeholderTextColor="#999"
              returnKeyType="done"
              onSubmitEditing={addItem}
            />
            <TouchableOpacity
              onPress={addItem}
              style={{ marginLeft: 8, backgroundColor: COLORS.green, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16 }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}>＋</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
