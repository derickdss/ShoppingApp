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

// Single source of truth for the list collection.
// - Always persists to AsyncStorage (works offline / without login).
// - When a user is signed in, mirrors the collection to Firebase so the same
//   lists appear on any other signed-in device.
export default function useLists() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState("local"); // "local" | "synced"
  const userRef = useRef(null);
  const listsRef = useRef([]);
  listsRef.current = lists;

  // Load local data once.
  useEffect(() => {
    loadLists().then((all) => {
      setLists(all);
      setLoading(false);
    });
  }, []);

  // Subscribe to auth. On sign-in (or app reopen after a redirect sign-in),
  // pull the cloud collection and merge it with what's on this device.
  useEffect(() => {
    const unsub = onAuthChange(async (u) => {
      setUser(u);
      userRef.current = u;
      if (!u) return;
      try {
        const cloud = await pullListsFromCloud(u);
        if (cloud && Array.isArray(cloud) && cloud.length) {
          setLists(cloud);
          saveLists(cloud);
          setSyncStatus("synced");
        } else {
          // No cloud data yet — push this device's lists so other phones see them.
          await syncListsToCloud(u, listsRef.current);
          setSyncStatus("synced");
        }
      } catch (e) {
        setSyncStatus("local");
      }
    });
    return unsub;
  }, []);

  // Persist + cloud sync helper.
  const commit = useCallback((nextLists) => {
    setLists(nextLists);
    saveLists(nextLists);
    if (userRef.current) {
      syncListsToCloud(userRef.current, nextLists).then(() =>
        setSyncStatus("synced")
      ).catch(() => setSyncStatus("local"));
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
    // Redirect flow: kicks off Google sign-in; the auth-state effect above
    // handles the cloud pull/push once the user comes back.
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
