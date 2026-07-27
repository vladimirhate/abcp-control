import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Не заполнены NEXT_PUBLIC_SUPABASE_URL или NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

// Используем createBrowserClient из @supabase/ssr, чтобы токен сохранялся в куках, а не в localStorage
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);