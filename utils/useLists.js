import { useCallback, useEffect, useRef, useState } from "react";
import { loadLists, saveLists } from "./storage";
import { buildNewList } from "./sections";
import {
  onAuthChange,
  loginWithGoogle,
  logout,
  syncListsToCloud,
  pullListsFromCloud,
  isFirebaseConfigured,
} from "./firebase";
import { syncHouseholdLists, onHouseholdLists } from "./household";

// Single source of truth for the list collection.
// - Always persists to AsyncStorage (works offline / without login).
// - When signed in AND in a household, the collection is the SHARED
//   household document, kept live via onSnapshot so every phone in the
//   household updates in real time.
// - When signed in but NOT in a household, mirrors to a private per-user doc.
export default function useLists(household = null) {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState("local"); // "local" | "synced"
  const userRef = useRef(null);
  const listsRef = useRef([]);
  listsRef.current = lists;
  const householdRef = useRef(household);
  householdRef.current = household;
  const codeRef = useRef(household ? household.code : null);
  codeRef.current = household ? household.code : null;

  // Per-list access: a list is visible to a member when it is shared with the
  // whole household (no sharedWith) or names their uid. The creator sees all.
  const visibleLists = (cloudLists) => {
    const all = cloudLists || [];
    const hh = householdRef.current;
    const uid = userRef.current ? userRef.current.uid : null;
    if (!hh || !uid) return all;
    const me = (hh.members || []).find((m) => m.uid === uid);
    if (!me || me.role === "creator") return all;
    return all.filter((l) => {
      const sw = l.sharedWith;
      return !sw || sw.length === 0 || sw.includes(uid);
    });
  };

  // Load local data once.
  useEffect(() => {
    loadLists().then((all) => {
      setLists(all);
      setLoading(false);
    });
  }, []);

  // Subscribe to auth. On sign-in, pull the private per-user collection
  // (only when there is no household yet).
  useEffect(() => {
    const unsub = onAuthChange(async (u) => {
      setUser(u);
      userRef.current = u;
      if (!u || codeRef.current) return;
      try {
        const cloud = await pullListsFromCloud(u);
        if (cloud && Array.isArray(cloud) && cloud.length) {
          setLists(cloud);
          saveLists(cloud);
          setSyncStatus("synced");
        } else {
          await syncListsToCloud(u, listsRef.current);
          setSyncStatus("synced");
        }
      } catch (e) {
        setSyncStatus("local");
      }
    });
    return unsub;
  }, []);

  // LIVE household sync: subscribe to the shared household lists doc.
  useEffect(() => {
    if (!codeRef.current) return;
    const code = codeRef.current;
    const unsub = onHouseholdLists(code, (cloudLists) => {
      if (Array.isArray(cloudLists) && cloudLists.length) {
        const visible = visibleLists(cloudLists);
        setLists(visible);
        saveLists(visible);
        setSyncStatus("synced");
      } else {
        // No shared lists yet — push this device's lists to seed the household.
        const local = listsRef.current;
        if (local.length) {
          syncHouseholdLists(code, local)
            .then(() => setSyncStatus("synced"))
            .catch(() => setSyncStatus("local"));
        } else {
          setSyncStatus("synced");
        }
      }
    });
    return unsub;
  }, [household ? household.code : null]);

  // Persist locally + push to cloud (household or per-user).
  const commit = useCallback((nextLists) => {
    setLists(nextLists);
    saveLists(nextLists);
    if (codeRef.current) {
      syncHouseholdLists(codeRef.current, nextLists)
        .then(() => setSyncStatus("synced"))
        .catch(() => setSyncStatus("local"));
    } else if (userRef.current) {
      syncListsToCloud(userRef.current, nextLists)
        .then(() => setSyncStatus("synced"))
        .catch(() => setSyncStatus("local"));
    }
  }, []);

  const createList = useCallback((title) => {
    const list = buildNewList(title);
    commit([list, ...lists]);
    return list.id;
  }, [lists, commit]);

  const updateList = useCallback((id, updater) => {
    commit(lists.map((l) => (l.id === id ? updater(l) : l)));
  }, [lists, commit]);

  const deleteList = useCallback((id) => {
    commit(lists.filter((l) => l.id !== id));
  }, [lists, commit]);

  const login = useCallback(async () => {
    await loginWithGoogle();
  }, []);

  const logoutUser = useCallback(async () => {
    await logout();
    setUser(null);
    userRef.current = null;
    setSyncStatus("local");
  }, []);

  return {
    lists,
    loading,
    user,
    syncStatus,
    firebaseEnabled: isFirebaseConfigured,
    createList,
    updateList,
    deleteList,
    login,
    logout: logoutUser,
  };
}
