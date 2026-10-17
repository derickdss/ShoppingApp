import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createHousehold,
  joinHousehold,
  leaveHousehold,
  setMemberAccess,
  addMember,
  myRole as computeMyRole,
  onHouseholdChange,
  HOUSEHOLD_CODE_KEY,
} from "./household";
import { onAuthChange, isFirebaseConfigured, storeUserProfile } from "./firebase";

// Tracks the signed-in user and which household (if any) they belong to,
// and keeps the household document (name + members) live. The returned
// `code` is what useLists uses to sync the shared shopping lists.
export default function useHousehold() {
  const [user, setUser] = useState(null);
  const [household, setHousehold] = useState(null); // { code, name, members }
  const [storedCode, setStoredCode] = useState(null);
  const [loading, setLoading] = useState(true);

  // Track auth; restore the remembered household code on sign-in.
  useEffect(() => {
    let unsubAuth = null;
    let cancelled = false;
    AsyncStorage.getItem(HOUSEHOLD_CODE_KEY)
      .then((code) => {
        if (cancelled) return;
        setStoredCode(code);
        unsubAuth = onAuthChange((u) => {
          setUser(u);
          if (u) storeUserProfile(u).catch(() => {}); // keep email on file for "add by email"
          if (!u) {
            setHousehold(null);
            setStoredCode(null);
            setLoading(false);
          }
        });
      })
      .catch(() => {
        unsubAuth = onAuthChange(setUser);
      });
    return () => {
      cancelled = true;
      if (unsubAuth) unsubAuth();
    };
  }, []);

  // Subscribe to the household doc whenever we know a code.
  useEffect(() => {
    if (!user || !storedCode) {
      setHousehold(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onHouseholdChange(storedCode, (hh) => {
      setHousehold(hh);
      setLoading(false);
      if (!hh) setStoredCode(null); // household deleted — forget the code
    });
    return () => {
      if (unsub) unsub();
    };
  }, [user, storedCode]);

  const create = useCallback(async (name) => {
    const code = await createHousehold(name);
    await AsyncStorage.setItem(HOUSEHOLD_CODE_KEY, code);
    setStoredCode(code);
    return code;
  }, []);

  const join = useCallback(async (code) => {
    const clean = await joinHousehold(code);
    await AsyncStorage.setItem(HOUSEHOLD_CODE_KEY, clean);
    setStoredCode(clean);
    return clean;
  }, []);

  const leave = useCallback(async () => {
    if (storedCode) {
      await leaveHousehold(storedCode);
      await AsyncStorage.removeItem(HOUSEHOLD_CODE_KEY);
      setStoredCode(null);
      setHousehold(null);
    }
  }, [storedCode]);

  // Change another member's role / access window, or remove them.
  const setAccess = useCallback(
    async (uid, patch) => {
      if (storedCode) await setMemberAccess(storedCode, uid, patch);
    },
    [storedCode]
  );

  // Convenience wrapper for plain removal.
  const remove = useCallback(
    async (uid) => {
      await setAccess(uid, { remove: true });
    },
    [setAccess]
  );

  // Add a member by their Google email (they must have signed in once).
  const add = useCallback(
    async (email) => {
      if (storedCode) await addMember(storedCode, email);
    },
    [storedCode]
  );

  return {
    user,
    code: storedCode,
    household,
    loading,
    firebaseEnabled: isFirebaseConfigured,
    myRole: computeMyRole(household, user ? user.uid : null),
    create,
    join,
    leave,
    remove,
    setAccess,
    addMember: add,
  };
}
