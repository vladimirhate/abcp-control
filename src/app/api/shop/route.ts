import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase/server";

// GET — получить данные магазина текущего пользователя
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Не авторизован" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("shops")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Ошибка GET" },
      { status: 500 }
    );
  }
}

// POST — создать магазин (при первом подключении с страницы /connect)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Не авторизован" }, { status: 401 });
    }

    const body = await request.json();

    const { data: existing } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: false, error: "Магазин уже подключен" }, { status: 400 });
    }

    const { data: shopData, error: shopError } = await supabaseAdmin
      .from("shops")
      .insert({
        owner_id: user.id,
        name: body.name,
        api_url: body.api_url,
        api_login: body.api_login,
        api_password_md5: body.api_password_md5,
      })
      .select()
      .single();

    if (shopError) throw shopError;

    await supabaseAdmin.from("salary_rules").insert({
      shop_id: shopData.id,
      name: "Основная схема",
      base_salary: 30000,
      revenue_percent: 1,
      margin_percent: 20,
      paid_revenue_percent: 2,
      plan_threshold: 500000,
      plan_bonus: 5000,
      is_default: true,
    });

    await supabaseAdmin.from("alerts_settings").insert({
      shop_id: shopData.id,
      stuck_order_hours: 24,
      daily_report_enabled: true,
    });

    return NextResponse.json({ success: true, data: shopData });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Ошибка POST" },
      { status: 500 }
    );
  }
}

// PUT — обновить данные магазина (или создать, если вдруг его не было)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Не авторизован" }, { status: 401 });
    }

    const body = await request.json();

    const updateData: Record<string, string> = {};
    if (body.name) updateData.name = body.name;
    if (body.api_url) updateData.api_url = body.api_url;
    if (body.api_login) updateData.api_login = body.api_login;
    if (body.api_password_md5) updateData.api_password_md5 = body.api_password_md5;

    // Пытаемся обновить существующий магазин
    const { data: updatedShop, error: updateError } = await supabaseAdmin
      .from("shops")
      .update(updateData)
      .eq("owner_id", user.id)
      .select()
      .maybeSingle();

    if (updateError) throw updateError;

    // Если магазина не было (updatedShop === null), создаем его
    if (!updatedShop) {
      const { data: newShop, error: insertError } = await supabaseAdmin
        .from("shops")
        .insert({
          owner_id: user.id,
          ...updateData
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Создаем дефолтные правила ЗП и алерты для нового магазина
      await supabaseAdmin.from("salary_rules").insert({
        shop_id: newShop.id,
        name: "Основная схема",
        base_salary: 30000,
        revenue_percent: 1,
        margin_percent: 20,
        paid_revenue_percent: 2,
        plan_threshold: 500000,
        plan_bonus: 5000,
        is_default: true,
      });

      await supabaseAdmin.from("alerts_settings").insert({
        shop_id: newShop.id,
        stuck_order_hours: 24,
        daily_report_enabled: true,
      });

      return NextResponse.json({ success: true, data: newShop });
    }

  } catch (error: any) {
    console.error("PUT /api/shop Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || JSON.stringify(error) || "Неизвестная ошибка при сохранении" },
      { status: 500 }
    );
  }
