import React from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../styles/App.styles";
import { useLists } from "../utils/ListsContext";
import { formatDate } from "../utils/sections";

export default function Home({ navigation }) {
  const {
    lists,
    loading,
    user,
    syncStatus,
    firebaseEnabled,
    createList,
    deleteList,
    login,
    logout,
  } = useLists();

  const sorted = [...lists].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const handleNewList = () => {
    const id = createList("");
    navigation.navigate("ListEditor", { id });
  };

  const confirmDelete = (list) => {
    Alert.alert(
      "Delete list?",
      `Delete "${list.title || "Untitled list"}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteList(list.id) },
      ]
    );
  };

  const handleLogin = async () => {
    try {
      await login();
    } catch (e) {
      Alert.alert("Sign in failed", e.message || "Could not sign in with Google.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Login / account bar */}
        <View style={{ backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 18, elevation: 2 }}>
          {user ? (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "bold", color: COLORS.text }}>{user.email}</Text>
                <Text style={{ fontSize: 13, color: COLORS.muted }}>
                  {syncStatus === "synced" ? "☁️ Synced to the cloud" : "📱 Saved on this device"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => logout()} style={{ marginLeft: 10, padding: 8 }}>
                <Text style={{ color: COLORS.danger, fontWeight: "bold" }}>Log out</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "bold", color: COLORS.text }}>
                  {firebaseEnabled ? "Sign in to sync across devices" : "Not signed in"}
                </Text>
                <Text style={{ fontSize: 13, color: COLORS.muted }}>
                  {firebaseEnabled
                    ? "Use the same Google account on another phone to see these lists."
                    : "Lists are saved on this device only."}
                </Text>
              </View>
              {firebaseEnabled && (
                <TouchableOpacity onPress={handleLogin} style={{ marginLeft: 10, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 }}>
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>Sign in</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* New list button */}
        <TouchableOpacity
          onPress={handleNewList}
          activeOpacity={0.85}
          style={{ backgroundColor: COLORS.green, borderRadius: 16, paddingVertical: 18, alignItems: "center", marginBottom: 22, elevation: 4 }}
        >
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "bold" }}>＋ New Shopping List</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 17, fontWeight: "bold", color: COLORS.primary, marginBottom: 12 }}>
          Your lists
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.header} style={{ marginTop: 30 }} />
        ) : sorted.length === 0 ? (
          <Text style={{ color: COLORS.muted, textAlign: "center", marginTop: 20 }}>
            No lists yet. Tap “New Shopping List” to get started!
          </Text>
        ) : (
          sorted.map((list) => {
            const total = list.sections.reduce((n, s) => n + s.items.length, 0);
            const done = list.sections.reduce((n, s) => n + s.items.filter((i) => i.done).length, 0);
            return (
              <TouchableOpacity
                key={list.id}
                onPress={() => navigation.navigate("ListEditor", { id: list.id })}
                activeOpacity={0.85}
                style={{ backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2 }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 18, fontWeight: "bold", color: COLORS.text, flex: 1 }}>
                    {list.title || "Untitled list"}
                  </Text>
                  <TouchableOpacity onPress={() => confirmDelete(list)} style={{ marginLeft: 8, padding: 6 }}>
                    <Text style={{ color: COLORS.danger, fontSize: 18 }}>🗑</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>
                  {formatDate(list.date, true)}
                </Text>
                <Text style={{ fontSize: 13, color: COLORS.muted, marginTop: 2 }}>
                  {total} item{total === 1 ? "" : "s"} • {done} done
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
