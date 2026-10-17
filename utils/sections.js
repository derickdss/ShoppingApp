// The default supermarket sections shown as accordions in a new list.
// Each entry becomes one accordion; `emoji` is a friendly icon for the header.
export const DEFAULT_SECTIONS = [
  { title: "Fruits & Veggies", emoji: "🥕" },
  { title: "Butter & Cheese", emoji: "🧀" },
  { title: "Dairy", emoji: "🥛" },
  { title: "Bread", emoji: "🍞" },
  { title: "Tea, Coffee & Cereals", emoji: "🍚" },
  { title: "Soaps, Shampoo & Toothpaste", emoji: "🧴" },
  { title: "Laundry & Dishwash", emoji: "🧼" },
  { title: "Frozen", emoji: "🧊" },
];

// Build a fresh list object pre-filled with the default (empty) sections.
export function buildNewList(title = "") {
  const now = new Date().toISOString();
  const trimmed = (title || "").trim();
  // Default title is the creation date, e.g. "17 Oct 2026-list".
  const finalTitle = trimmed || `${formatDate(now)}-list`;
  return {
    id: makeId(),
    title: finalTitle,
    date: now,
    sections: DEFAULT_SECTIONS.map((s) => ({
      id: makeId(),
      title: s.title,
      emoji: s.emoji,
      items: [],
    })),
  };
}

export function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Human friendly date, e.g. "17 Oct 2026" or "17 Oct 2026, 3:05 PM"
export function formatDate(iso, withTime = false) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let h = d.getHours() % 12 || 12;
  const ampm = d.getHours() >= 12 ? "PM" : "AM";
  const base = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  if (!withTime) return base;
  return `${base}, ${h}:${String(d.getMinutes()).padStart(2, "0")} ${ampm}`;
}
