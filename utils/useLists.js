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
  const skipPull = useRef(false);

  // Load local data once.
  useEffect(() => {
    loadLists().then((all) => {
      setLists(all);
      setLoading(false);
    });
  }, []);

  // Subscribe to auth and handle cloud pull on sign-in.
  useEffect(() => {
    const unsub = onAuthChange(async (u) => {
      setUser(u);
      userRef.current = u;
      if (u && !skipPull.current) {
        const cloud = await pullListsFromCloud(u);
        if (cloud && Array.isArray(cloud) && cloud.length) {
          setLists(cloud);
          saveLists(cloud);
          setSyncStatus("synced");
        }
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
    skipPull.current = false;
    const u = await loginWithGoogle();
    setUser(u);
    userRef.current = u;
    // Pull cloud data, then push local if cloud is empty.
    const cloud = await pullListsFromCloud(u);
    if (cloud && Array.isArray(cloud) && cloud.length) {
      setLists(cloud);
      saveLists(cloud);
    } else {
      await syncListsToCloud(u, lists);
    }
    setSyncStatus("synced");
    return u;
  }, [lists]);

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
