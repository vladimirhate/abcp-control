import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getShop, getSalaryRule } from "@/lib/shop";

export async function GET() {
  try {
    const shop = await getShop();
    if (!shop) throw new Error("Магазин не найден");
    const data = await getSalaryRule(shop.id);
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

    const updateData: Record<string, number | string | number[]> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.base_salary !== undefined) updateData.base_salary = Number(body.base_salary);
    if (body.revenue_percent !== undefined) updateData.revenue_percent = Number(body.revenue_percent);
    if (body.margin_percent !== undefined) updateData.margin_percent = Number(body.margin_percent);
    if (body.paid_revenue_percent !== undefined) updateData.paid_revenue_percent = Number(body.paid_revenue_percent);
    if (body.plan_threshold !== undefined) updateData.plan_threshold = Number(body.plan_threshold);
    if (body.plan_bonus !== undefined) updateData.plan_bonus = Number(body.plan_bonus);
    
    // Новые поля
    if (body.calc_method !== undefined) updateData.calc_method = body.calc_method;
    if (body.delivered_statuses !== undefined) {
      updateData.delivered_statuses = Array.isArray(body.delivered_statuses) ? body.delivered_statuses.map(Number) : [];
    }

    const { data, error } = await supabaseAdmin
      .from("salary_rules")
      .update(updateData)
      .eq("shop_id", shop.id)
      .eq("is_default", true)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Ошибка" }, { status: 500 });
  }
}