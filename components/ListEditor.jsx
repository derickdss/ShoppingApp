import React, { useState, useEffect } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { COLORS } from "../styles/App.styles";
import { useLists } from "../utils/ListsContext";
import { makeId, formatDate } from "../utils/sections";
import Accordion from "./Accordion";
import PromptModal from "./PromptModal";

export default function ListEditor({ route, navigation }) {
  const { lists, updateList, loading } = useLists();
  const id = route.params.id;
  const list = lists.find((l) => l.id === id);

  // Keep every section open by default (single vertical page); user can collapse.
  const [open, setOpen] = useState(() => {
    const initial = {};
    if (list) list.sections.forEach((s) => (initial[s.id] = true));
    return initial;
  });
  const [showNewSection, setShowNewSection] = useState(false);

  // Once the list is loaded, make sure every section starts open (single
  // vertical page). Runs only the first time the list becomes available.
  useEffect(() => {
    if (list && Object.keys(open).length === 0) {
      const initial = {};
      list.sections.forEach((s) => (initial[s.id] = true));
      setOpen(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setSectionOpen = (sectionId, value) =>
    setOpen((prev) => ({ ...prev, [sectionId]: value }));

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={COLORS.header} />
      </View>
    );
  }

  if (!list) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: "center", alignItems: "center", padding: 30 }}>
        <Text style={{ color: COLORS.muted, fontSize: 16 }}>This list no longer exists.</Text>
      </View>
    );
  }

  const patch = (updater) => updateList(id, (l) => updater(l));

  const setTitle = (title) => patch((l) => ({ ...l, title }));

  const addSection = (title) => {
    const t = title.trim();
    if (!t) return;
    patch((l) => ({
      ...l,
      sections: [...l.sections, { id: makeId(), title: t, emoji: "📦", items: [] }],
    }));
    setShowNewSection(false);
  };

  const addItem = (sectionId, name) =>
    patch((l) => ({
      ...l,
      sections: l.sections.map((s) =>
        s.id === sectionId
          ? { ...s, items: [...s.items, { id: makeId(), name, done: false }] }
          : s
      ),
    }));

  const toggleItem = (sectionId, itemId) =>
    patch((l) => ({
      ...l,
      sections: l.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              items: s.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)),
            }
          : s
      ),
    }));

  const removeItem = (sectionId, itemId) =>
    patch((l) => ({
      ...l,
      sections: l.sections.map((s) =>
        s.id === sectionId
          ? { ...s, items: s.items.filter((i) => i.id !== itemId) }
          : s
      ),
    }));

  const renameSection = (sectionId, title) => {
    const t = title.trim();
    if (!t) return;
    patch((l) => ({
      ...l,
      sections: l.sections.map((s) => (s.id === sectionId ? { ...s, title: t } : s)),
    }));
  };

  const total = list.sections.reduce((n, s) => n + s.items.length, 0);
  const done = list.sections.reduce((n, s) => n + s.items.filter((i) => i.done).length, 0);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* List title */}
        <TextInput
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color: COLORS.primary,
            paddingVertical: 6,
            marginBottom: 4,
          }}
          value={list.title}
          onChangeText={setTitle}
          placeholder="Untitled list"
          placeholderTextColor="#999"
        />
        <Text style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>
          {formatDate(list.date, true)} • {total} item{total === 1 ? "" : "s"} • {done} done
        </Text>

        {/* Sections */}
        {list.sections.map((section) => (
          <Accordion
            key={section.id}
            section={section}
            open={!!open[section.id]}
            onToggle={() => setSectionOpen(section.id, !open[section.id])}
            onAddItem={(name) => addItem(section.id, name)}
            onToggleItem={(itemId) => toggleItem(section.id, itemId)}
            onRemoveItem={(itemId) => removeItem(section.id, itemId)}
          />
        ))}

        {/* Add a new section */}
        <TouchableOpacity
          onPress={() => setShowNewSection(true)}
          activeOpacity={0.85}
          style={{
            marginTop: 4,
            backgroundColor: COLORS.accent,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            elevation: 3,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 17, fontWeight: "bold" }}>
            ＋ Add a new section
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <PromptModal
        visible={showNewSection}
        title="New section name"
        placeholder="e.g. Snacks, Baby, Household"
        confirmLabel="Add section"
        onConfirm={addSection}
        onCancel={() => setShowNewSection(false)}
      />
    </View>
  );
}
