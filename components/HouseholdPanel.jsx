import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
} from "react-native";
import { COLORS } from "../styles/App.styles";
import { isMemberActive } from "../utils/household";
const DAY = 86400000;
const EXPIRY_PRESETS = [
  { label: "Forever", value: null },
  { label: "1 day", value: DAY },
  { label: "7 days", value: 7 * DAY },
  { label: "30 days", value: 30 * DAY },
];

function expiryLabel(m) {
  if (m.role === "creator") return "";
  if (!m.expiresAt) return "access: forever";
  const left = m.expiresAt - Date.now();
  if (left <= 0) return "access: expired";
  const days = Math.ceil(left / DAY);
  return `access: ${days} day${days === 1 ? "" : "s"} left`;
}

function roleBadge(m) {
  switch (m.role) {
    case "creator":
      return <Text style={{ color: COLORS.accent, fontWeight: "bold", fontSize: 12 }}>Creator</Text>;
    case "admin":
      return <Text style={{ color: COLORS.primary, fontWeight: "bold", fontSize: 12 }}>Admin</Text>;
    default:
      return <Text style={{ color: COLORS.muted, fontSize: 12 }}>Member</Text>;
  }
}

// The household card: share code, member management (roles, time-limited
// access, add-by-email, remove) and per-list sharing for the creator.
export default function HouseholdPanel({
  household,
  user,
  lists,
  onLeave,
  onSetAccess,
  onAddMember,
  updateList,
  create,
  join,
}) {
  const [joinCode, setJoinCode] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [accessFor, setAccessFor] = useState(null); // member being edited
  const [customDate, setCustomDate] = useState("");
  const [shareFor, setShareFor] = useState(null); // list being shared
  const [shareSel, setShareSel] = useState([]);

  if (!household) {
    return (
      <View style={card}>
        <Text style={title}>🏠 Household</Text>
        <Text style={muted}>
          Create a household to share lists with family on other phones. The creator can add
          members by email, give them admin rights, and limit access in time.
        </Text>
        {showJoin ? (
          <View style={{ flexDirection: "row", marginTop: 10, alignItems: "center" }}>
            <TextInput
              value={joinCode}
              onChangeText={setJoinCode}
              placeholder="Household code"
              style={input}
            />
            <TouchableOpacity
              onPress={async () => {
                try {
                  await join(joinCode);
                  setJoinCode("");
                  setShowJoin(false);
                } catch (e) {
                  Alert.alert("Couldn't join", e.message);
                }
              }}
              style={btnPrimary}
            >
              <Text style={btnPrimaryText}>Join</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: "row", marginTop: 10 }}>
            <TouchableOpacity
              onPress={async () => {
                try {
                  await create();
                } catch (e) {
                  Alert.alert("Couldn't create household", e.message);
                }
              }}
              style={[btnGreen, { flex: 1 }]}
            >
              <Text style={btnGreenText}>Create household</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowJoin(true)}
              style={[{ flex: 1, marginLeft: 8 }, btnOutline]}
            >
              <Text style={[{ color: COLORS.primary, fontWeight: "bold" }, btnOutlineText]}>
                Join with code
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  const members = household.members || [];
  const me = members.find((m) => m.uid === user?.uid);
  const canManage = !!me && (me.role === "creator" || me.role === "admin");

  const openShare = (list) => {
    setShareFor(list);
    setShareSel(list.sharedWith || []);
  };

  const saveShare = () => {
    if (shareFor) updateList(shareFor.id, (l) => ({ ...l, sharedWith: shareSel }));
    setShareFor(null);
  };

  const confirmRemove = (m) => {
    Alert.alert(
      "Remove member?",
      `${m.email} will lose access to the household and its lists.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => onSetAccess(m.uid, { remove: true }),
        },
      ]
    );
  };

  return (
    <View style={card}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={title}>🏠 {household.name}</Text>
        <TouchableOpacity onPress={onLeave} style={{ padding: 6 }}>
          <Text style={{ color: COLORS.danger, fontWeight: "bold" }}>Leave</Text>
        </TouchableOpacity>
      </View>
      <Text style={muted}>
        Share code: <Text style={{ fontWeight: "bold", fontSize: 16, letterSpacing: 2 }}>{household.code}</Text> — anyone with this code can join.
      </Text>

      {/* Add member by email */}
      {canManage && (
        <View style={{ flexDirection: "row", marginTop: 10, alignItems: "center" }}>
          <TextInput
            value={addEmail}
            onChangeText={setAddEmail}
            placeholder="Add member by email…"
            placeholderTextColor="#999"
            style={[input, { flex: 1, marginBottom: 0 }]}
          />
          <TouchableOpacity
            onPress={async () => {
              try {
                await onAddMember(addEmail);
                setAddEmail("");
              } catch (e) {
                Alert.alert("Couldn't add member", e.message);
              }
            }}
            style={btnPrimary}
          >
            <Text style={btnPrimaryText}>Add</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={{ ...muted, marginTop: 10, fontWeight: "bold" }}>
        Members ({members.length})
      </Text>
      {members.map((m) => {
        const active = isMemberActive(m);
        const isMe = m.uid === user?.uid;
        const manageable = canManage && m.role !== "creator";
        return (
          <View key={m.uid} style={{ marginTop: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: active ? COLORS.text : COLORS.muted }}>
                  {m.email} {isMe && "(you)"}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {roleBadge(m)}
                  {m.expiresAt && (
                    <Text style={{ fontSize: 11, color: active ? COLORS.muted : COLORS.danger, marginLeft: 6 }}>
                      {expiryLabel(m)}
                    </Text>
                  )}
                </View>
              </View>
              {manageable && (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <TouchableOpacity
                    onPress={() => setAccessFor(m)}
                    style={{ padding: 4 }}
                  >
                    <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: "bold" }}>
                      Time
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onSetAccess(m.uid, { role: m.role === "admin" ? "member" : "admin" })}
                    style={{ padding: 4 }}
                  >
                    <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: "bold" }}>
                      {m.role === "admin" ? "Make member" : "Make admin"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmRemove(m)} style={{ padding: 4 }}>
                    <Text style={{ color: COLORS.danger, fontSize: 12, fontWeight: "bold" }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        );
      })}

      {/* Per-list sharing (creator only) */}
      {me && me.role === "creator" && (
        <View style={{ marginTop: 14 }}>
          <Text style={{ ...muted, fontWeight: "bold" }}>List access</Text>
          <Text style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>
            Lists shared with the whole household are visible to everyone. Share a specific
            list with selected members only.
          </Text>
          {lists.map((l) => {
            const sw = l.sharedWith || [];
            return (
              <View
                key={l.id}
                style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}
              >
                <Text style={{ fontSize: 13, color: COLORS.text, flex: 1 }}>
                  {l.title || "Untitled list"}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ fontSize: 12, color: COLORS.muted, marginRight: 6 }}>
                    {sw.length === 0 ? "whole household" : `${sw.length} member${sw.length === 1 ? "" : "s"}`}
                  </Text>
                  <TouchableOpacity onPress={() => openShare(l)} style={{ padding: 4 }}>
                    <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: "bold" }}>Share</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Time-window picker */}
      <Modal transparent visible={!!accessFor} animationType="fade">
        <View style={backdrop}>
          <View style={modalCard}>
            <Text style={modalTitle}>
              Access for {accessFor ? accessFor.email : ""}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}>
              {EXPIRY_PRESETS.map((p) => (
                <TouchableOpacity
                  key={p.label}
                  onPress={() => {
                    onSetAccess(accessFor.uid, { expiresAt: p.value ? Date.now() + p.value : null });
                    setAccessFor(null);
                  }}
                  style={chip}
                >
                  <Text style={chipText}>{p.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => setCustomDate("")} style={chip}>
                <Text style={chipText}>Custom date…</Text>
              </TouchableOpacity>
            </View>
            {customDate !== null && (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TextInput
                  value={customDate}
                  onChangeText={setCustomDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#999"
                  style={[input, { flex: 1, marginBottom: 8 }]}
                />
                <TouchableOpacity
                  onPress={() => {
                    const t = Date.parse(customDate);
                    if (isNaN(t)) {
                      Alert.alert("Invalid date", "Use YYYY-MM-DD.");
                      return;
                    }
                    onSetAccess(accessFor.uid, { expiresAt: t + DAY });
                    setAccessFor(null);
                  }}
                  style={btnPrimary}
                >
                  <Text style={btnPrimaryText}>Set</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity onPress={() => setAccessFor(null)} style={[{ marginTop: 10, alignItems: "center" }, btnGhost]}>
              <Text style={{ color: COLORS.muted, fontWeight: "bold" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Per-list sharing picker */}
      <Modal transparent visible={!!shareFor} animationType="fade">
        <View style={backdrop}>
          <View style={modalCard}>
            <Text style={modalTitle}>
              Share “{shareFor ? shareFor.title || "Untitled list" : ""}” with…
            </Text>
            <TouchableOpacity
              onPress={() => setShareSel([])}
              style={[chip, shareSel.length === 0 && { backgroundColor: COLORS.primary }]}
            >
              <Text style={[chipText, shareSel.length === 0 && { color: "#fff" }]}>
                Whole household
              </Text>
            </TouchableOpacity>
            {members
              .filter((m) => m.uid !== user?.uid && isMemberActive(m))
              .map((m) => {
                const on = shareSel.includes(m.uid);
                return (
                  <TouchableOpacity
                    key={m.uid}
                    onPress={() =>
                      setShareSel((prev) => (on ? prev.filter((u) => u !== m.uid) : [...prev, m.uid]))
                    }
                    style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}
                  >
                    <Text style={{ fontSize: 15, marginRight: 8 }}>{on ? "☑" : "☐"}</Text>
                    <Text style={{ fontSize: 14, color: COLORS.text }}>{m.email}</Text>
                  </TouchableOpacity>
                );
              })}
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 10 }}>
              <TouchableOpacity onPress={() => setShareFor(null)} style={[{ marginRight: 8 }, btnGhost]}>
                <Text style={{ color: COLORS.muted, fontWeight: "bold" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveShare} style={btnPrimary}>
                <Text style={btnPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const card = {
  backgroundColor: "#fff",
  borderRadius: 14,
  padding: 14,
  marginBottom: 18,
  elevation: 2,
};
const title = { fontSize: 15, fontWeight: "bold", color: COLORS.text };
const muted = { fontSize: 13, color: COLORS.muted, marginTop: 2 };
const input = {
  borderWidth: 1,
  borderColor: COLORS.primary,
  borderRadius: 10,
  paddingHorizontal: 12,
  fontSize: 14,
  color: COLORS.text,
  backgroundColor: "#F7F7FF",
};
const btnPrimary = {
  marginLeft: 8,
  backgroundColor: COLORS.primary,
  borderRadius: 10,
  paddingVertical: 10,
  paddingHorizontal: 14,
};
const btnPrimaryText = { color: "#fff", fontWeight: "bold" };
const btnGreen = { backgroundColor: COLORS.green, borderRadius: 10, paddingVertical: 10, alignItems: "center" };
const btnGreenText = { color: "#fff", fontWeight: "bold" };
const btnOutline = {
  borderWidth: 1,
  borderColor: COLORS.primary,
  borderRadius: 10,
  paddingVertical: 10,
  alignItems: "center",
};
const btnOutlineText = { fontSize: 14 };
const btnGhost = { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 };
const backdrop = {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.4)",
  justifyContent: "center",
  alignItems: "center",
  padding: 24,
};
const modalCard = { width: "100%", backgroundColor: "#fff", borderRadius: 16, padding: 20 };
const modalTitle = { fontSize: 16, fontWeight: "bold", color: COLORS.text, marginBottom: 12 };
const chip = {
  borderWidth: 1,
  borderColor: COLORS.primary,
  borderRadius: 16,
  paddingVertical: 6,
  paddingHorizontal: 12,
  marginRight: 8,
  marginBottom: 8,
};
const chipText = { color: COLORS.primary, fontWeight: "bold", fontSize: 13 };
