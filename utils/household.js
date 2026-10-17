// Household: a group of Google accounts that share the same shopping lists.
//
// Data layout (Firestore):
//   households/{code}                 { name, code, members: [...], createdAt }
//   households/{code}/lists/{data}    { lists: [...], updatedAt }
//
// Member shape:
//   { uid, email, joinedAt, role: "creator"|"admin"|"member",
//     expiresAt: number|null }        // null = forever
//
// Roles:
//   creator — created the household; full control, can never be removed
//             or have their access changed by anyone else.
//   admin   — can add (via the share code) and remove members, set access
//             windows, toggle admins, and control per-list sharing.
//             Cannot change or remove the creator's access.
//   member  — reads/writes the lists they have access to.
//
// Per-list sharing (on each list object):
//   sharedWith: [uid, ...] — empty/absent = whole household;
//   a non-empty array = only those members (plus the creator) can see it.

import { doc, setDoc, getDoc, onSnapshot, updateDoc, deleteDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDb, findUserByEmail } from "./firebase";

export const HOUSEHOLD_CODE_KEY = "shopping.household.code.v1";

export async function getStoredHouseholdCode() {
  try {
    return await AsyncStorage.getItem(HOUSEHOLD_CODE_KEY);
  } catch (e) {
    return null;
  }
}

const householdRef = (code) => doc(getDb(), "households", code.toUpperCase());
const listsRef = (code) => doc(getDb(), "households", code.toUpperCase(), "lists", "data");
// One pending invitation per email. Cleared once accepted/declined.
const invitationRef = (email) => doc(getDb(), "invitations", email.trim().toLowerCase());

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I look-alikes
  let c = "";
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

// ---------------------------------------------------------------- helpers

export function isMemberActive(member, now = Date.now()) {
  if (!member) return false;
  if (member.role === "creator") return true; // the creator is always active
  if (member.expiresAt == null) return true;   // null = forever
  return member.expiresAt > now;
}

export function myRole(household, uid) {
  if (!household || !uid) return null;
  const me = (household.members || []).find((m) => m.uid === uid);
  return isMemberActive(me) ? me.role : null;
}

// ---------------------------------------------------------------- create / join / leave

export async function createHousehold(name) {
  if (!getDb()) throw new Error("Firebase is not configured yet.");
  const user = getAuth().currentUser;
  if (!user) throw new Error("Sign in first.");
  const code = makeCode();
  const member = {
    uid: user.uid,
    email: user.email || "",
    joinedAt: Date.now(),
    role: "creator",
    expiresAt: null,
  };
  await setDoc(householdRef(code), {
    name: (name || "My household").trim(),
    code,
    members: [member],
    createdAt: Date.now(),
  });
  return code;
}

export async function joinHousehold(code) {
  if (!getDb()) throw new Error("Firebase is not configured yet.");
  const user = getAuth().currentUser;
  if (!user) throw new Error("Sign in first.");
  const clean = (code || "").trim().toUpperCase();
  if (!clean) throw new Error("Enter a household code.");
  const snap = await getDoc(householdRef(clean));
  if (!snap.exists()) throw new Error(`No household with code ${clean}.`);
  const data = snap.data();
  const existing = (data.members || []).find((m) => m.uid === user.uid);
  if (!existing) {
    await updateDoc(householdRef(clean), {
      members: data.members.concat({
        uid: user.uid,
        email: user.email || "",
        joinedAt: Date.now(),
        role: "member",
        expiresAt: null,
      }),
    });
  } else if (!isMemberActive(existing)) {
    throw new Error(
      "Your access to this household has expired. Ask the household creator to re-add you."
    );
  }
  return clean;
}

export async function leaveHousehold(code) {
  if (!getDb() || !code) return;
  const user = getAuth().currentUser;
  if (!user) return;
  const snap = await getDoc(householdRef(code));
  if (!snap.exists()) return;
  await updateDoc(householdRef(code), {
    members: snap.data().members.filter((m) => m.uid !== user.uid),
  });
}

// ---------------------------------------------------------------- member management
//
// `setMemberAccess(code, uid, { role, expiresAt, remove })`
//   role:      "creator" | "admin" | "member"
//   expiresAt: number (timestamp) | null (forever)
//   remove:    true to drop the member from the household
//
// Rules enforced here:
//   - only the creator or an admin can call it (and not for the creator's row)
//   - the creator can never be removed or have their access changed
//   - the last admin can't be demoted/removed without a replacement
export async function setMemberAccess(code, uid, { role, expiresAt, remove } = {}) {
  if (!getDb() || !code || !uid) return;
  const user = getAuth().currentUser;
  if (!user) throw new Error("Sign in first.");
  const snap = await getDoc(householdRef(code));
  if (!snap.exists()) throw new Error("Household not found.");
  const members = snap.data().members || [];
  const me = members.find((m) => m.uid === user.uid);
  if (!me || !isMemberActive(me)) throw new Error("You are no longer a member of this household.");
  if (me.role !== "creator" && me.role !== "admin") {
    throw new Error("Only the creator or an admin can change member access.");
  }
  const target = members.find((m) => m.uid === uid);
  if (!target) throw new Error("Member not found.");
  if (target.role === "creator") {
    throw new Error("The creator's access can't be changed.");
  }
  if (remove) {
    if (target.role === "admin" && members.filter((m) => m.role === "admin").length <= 1) {
      throw new Error("Promote another admin first — a household needs at least one admin (the creator counts).");
    }
    await updateDoc(householdRef(code), {
      members: members.filter((m) => m.uid !== uid),
    });
    return;
  }
  const next = members.map((m) =>
    m.uid === uid
      ? { ...m, role: role || m.role, expiresAt: expiresAt === undefined ? m.expiresAt : expiresAt }
      : m
  );
  await updateDoc(householdRef(code), { members: next });
}

// Add a member by email. If that person has already signed in with the Google
// account (so we know their uid), they're added straight away. Otherwise we
// leave a pending invitation in Firestore — the next time they sign in, the
// app shows them a "you've been invited" prompt to accept.
//
// Returns { added: true, email } or { invited: true, email }.
export async function addMember(code, email) {
  if (!getDb() || !code) throw new Error("Firebase is not configured yet.");
  const user = getAuth().currentUser;
  if (!user) throw new Error("Sign in first.");
  const clean = (code || "").trim().toUpperCase();
  const snap = await getDoc(householdRef(clean));
  if (!snap.exists()) throw new Error("Household not found.");
  const members = snap.data().members || [];
  const me = members.find((m) => m.uid === user.uid);
  if (!me || (me.role !== "creator" && me.role !== "admin")) {
    throw new Error("Only the creator or an admin can add members.");
  }
  const em = (email || "").trim().toLowerCase();
  if (!em) throw new Error("Enter an email address.");
  if (members.some((m) => m.email === em)) throw new Error("That person is already in the household.");
  const uid = await findUserByEmail(em);
  if (uid) {
    await updateDoc(householdRef(clean), {
      members: members.concat({
        uid,
        email: em,
        joinedAt: Date.now(),
        role: "member",
        expiresAt: null,
      }),
    });
    // If there was a pending invitation for this email, clear it.
    await deleteDoc(invitationRef(em)).catch(() => {});
    return { added: true, email: em };
  }
  // Not signed in yet — leave a pending invitation for them to accept.
  await setDoc(invitationRef(em), {
    email: em,
    householdCode: clean,
    householdName: snap.data().name,
    invitedBy: me.email || "a household admin",
    createdAt: Date.now(),
    status: "pending",
  });
  return { invited: true, email: em };
}

// ---------------------------------------------------------------- invitations

// Return the signed-in user's pending invitation (if any), or null.
export async function getPendingInvitation(email) {
  if (!getDb() || !email) return null;
  const snap = await getDoc(invitationRef(email));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (data.status !== "pending") return null;
  return {
    email: data.email,
    householdCode: data.householdCode,
    householdName: data.householdName,
    invitedBy: data.invitedBy,
    createdAt: data.createdAt,
  };
}

// Accept: add the signed-in user to the household and clear the invitation.
// Returns the household code (for the caller to start syncing lists).
export async function acceptInvitation(invitation) {
  if (!getDb() || !invitation) throw new Error("Nothing to accept.");
  const user = getAuth().currentUser;
  if (!user) throw new Error("Sign in first.");
  const clean = (invitation.householdCode || "").toUpperCase();
  const snap = await getDoc(householdRef(clean));
  await deleteDoc(invitationRef(invitation.email)).catch(() => {});
  if (!snap.exists()) throw new Error("That household no longer exists.");
  const members = snap.data().members || [];
  if (!members.some((m) => m.uid === user.uid)) {
    await updateDoc(householdRef(clean), {
      members: members.concat({
        uid: user.uid,
        email: user.email || "",
        joinedAt: Date.now(),
        role: "member",
        expiresAt: null,
      }),
    });
  }
  return clean;
}

// Decline: just clear the invitation.
export async function declineInvitation(email) {
  if (!getDb() || !email) return;
  await deleteDoc(invitationRef(email)).catch(() => {});
}

// ---------------------------------------------------------------- live subscriptions

// Subscribe to the household document (name + member list). Returns unsubscribe.
export function onHouseholdChange(code, callback) {
  if (!getDb() || !code) {
    callback(null);
    return () => {};
  }
  return onSnapshot(householdRef(code), (snap) => {
    callback(snap.exists() ? { code: snap.id, ...snap.data() } : null);
  }, () => callback(null));
}

// Push this device's lists to the shared household document.
export async function syncHouseholdLists(code, lists) {
  if (!getDb() || !code) return;
  await setDoc(listsRef(code), { lists, updatedAt: Date.now() });
}

// Live subscription: fires immediately and every time ANY member edits the
// lists — this is what makes both phones update in real time.
export function onHouseholdLists(code, callback) {
  if (!getDb() || !code) {
    callback(null);
    return () => {};
  }
  return onSnapshot(
    listsRef(code),
    (snap) => callback(snap.exists() ? snap.data().lists || [] : []),
    (err) => {
      console.warn("household lists listener:", err);
      callback(null);
    }
  );
}
