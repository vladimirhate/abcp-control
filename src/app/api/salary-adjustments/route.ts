import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getShop } from "@/lib/shop";

// GET — получить корректировки для всех менеджеров за конкретный месяц
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    if (!month) return NextResponse.json({ error: "Не указан месяц" }, { status: 400 });

    const shop = await getShop();
    if (!shop) throw new Error("Магазин не найден");

    const { data, error } = await supabaseAdmin
      .from("salary_adjustments")
      .select("*")
      .eq("shop_id", shop.id)
      .eq("month", month);

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT — сохранить или обновить корректировку для конкретного менеджера
export async function PUT(request: NextRequest) {
  try {
    const shop = await getShop();
    if (!shop) throw new Error("Магазин не найден");

    const body = await request.json();
    const { managerId, month, amount, reason } = body;

    const { data, error } = await supabaseAdmin
      .from("salary_adjustments")
      .upsert({
        shop_id: shop.id,
        manager_id: managerId,
        month: month,
        amount: Number(amount),
        reason: reason || null
      }, { onConflict: 'shop_id,manager_id,month' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}