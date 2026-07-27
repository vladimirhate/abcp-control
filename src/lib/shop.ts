import { supabaseAdmin } from "./supabase-admin";
import { createClient } from "./supabase/server";

export type Shop = {
  id: string;
  owner_id: string;
  name: string;
  api_url: string;
  api_login: string;
  api_password_md5: string;
  is_active: boolean;
  created_at: string;
};

export type SalaryRule = {
  id: string;
  shop_id: string;
  name: string;
  base_salary: number;
  revenue_percent: number;
  margin_percent: number;
  paid_revenue_percent: number;
  plan_threshold: number;
  plan_bonus: number;
  is_default: boolean;
};

export type AlertsSettings = {
  id: string;
  shop_id: string;
  stuck_order_hours: number;
  daily_report_enabled: boolean;
  daily_report_time: string;
  telegram_chat_id: string | null;
};

// Получаем ID текущего авторизованного пользователя
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

// Получаем магазин текущего пользователя
export async function getShop(): Promise<Shop | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabaseAdmin
    .from("shops")
    .select("*")
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Ошибка загрузки магазина:", error);
    return null;
  }

  return data as Shop;
}

export async function getSalaryRule(shopId: string): Promise<SalaryRule | null> {
  const { data, error } = await supabaseAdmin
    .from("salary_rules")
    .select("*")
    .eq("shop_id", shopId)
    .eq("is_default", true)
    .maybeSingle();

  if (error) {
    console.error("Ошибка загрузки правил ЗП:", error);
    return null;
  }

  return data as SalaryRule;
}

export async function getAlertsSettings(shopId: string): Promise<AlertsSettings | null> {
  const { data, error } = await supabaseAdmin
    .from("alerts_settings")
    .select("*")
    .eq("shop_id", shopId)
    .maybeSingle();

  if (error) {
    console.error("Ошибка загрузки настроек алертов:", error);
    return null;
  }

  return data as AlertsSettings;
}