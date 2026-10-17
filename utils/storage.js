import AsyncStorage from "@react-native-async-storage/async-storage";

const LISTS_KEY = "shopping.lists.v1";

// Load all shopping lists from local storage. Returns [] if none yet.
export async function loadLists() {
  try {
    const raw = await AsyncStorage.getItem(LISTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

// Persist the whole collection. Kept as a single document so syncing is trivial.
export async function saveLists(lists) {
  try {
    await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(lists || []));
  } catch (e) {
    // storage failures should never crash the app
  }
}
