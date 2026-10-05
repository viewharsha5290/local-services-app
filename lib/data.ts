// Provider data now lives in Supabase (see supabase/schema.sql + supabase/seed.sql).
// This file only keeps small UI constants that aren't real user/business data.
export const HOME_POSTAL_CODE = "M4C 1A1";

// In-app chat is still a local mock (messages go nowhere), so it stays off even for listings a
// real business has claimed. Flip this once chat has a real backend.
export const CHAT_ENABLED = false;
