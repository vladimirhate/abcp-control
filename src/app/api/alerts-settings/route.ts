import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getShop, getAlertsSettings } from "@/lib/shop";

export async function GET() {
  try {
    const shop = await getShop();
    if (!shop) throw new Error("Магазин не найден");

    const data = await getAlertsSettings(shop.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Ошибка" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const shop = await getShop();
    if (!shop) throw new Error("Магазин не найден");

    const body = await request.json();

    const updateData: Record<string, number | string | boolean> = {};
    if (body.stuck_order_hours !== undefined) updateData.stuck_order_hours = Number(body.stuck_order_hours);
    if (body.daily_report_enabled !== undefined) updateData.daily_report_enabled = Boolean(body.daily_report_enabled);
    if (body.daily_report_time !== undefined) updateData.daily_report_time = body.daily_report_time;
    if (body.telegram_chat_id !== undefined) updateData.telegram_chat_id = body.telegram_chat_id;

    const { data, error } = await supabaseAdmin
      .from("alerts_settings")
      .update(updateData)
      .eq("shop_id", shop.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Ошибка" }, { status: 500 });
  }
}