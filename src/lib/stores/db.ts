import Database from "@tauri-apps/plugin-sql";

// Schema migrations are registered Rust-side in src-tauri/src/lib.rs.
// Database.load triggers them; the URI must match exactly.
const DB_URI = "sqlite:initiative-tracker.db";

async function open(): Promise<Database | null> {
  // SSR / prerender — no window, no Tauri runtime, no DB.
  if (typeof window === "undefined") return null;
  try {
    return await Database.load(DB_URI);
  } catch (err) {
    // Non-Tauri preview (vite preview without the shell) or plugin failure.
    // Mutators will fall back to localStorage-only behavior.
    console.warn("SQLite unavailable; persistence will be localStorage-only", err);
    return null;
  }
}

// Resolved once at module load; every mutator awaits this before issuing
// writes so they queue behind initialization without re-opening.
export const dbReady: Promise<Database | null> = open();
