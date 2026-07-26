import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CURRENT_SHOP_ID } from "@/lib/shop";

// GET — получить правила ЗП
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("salary_rules")
      .select("*")
      .eq("shop_id", CURRENT_SHOP_ID)
      .eq("is_default", true)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Неизвестная ошибка",
      },
      { status: 500 }
    );
  }
}

// PUT — обновить правила ЗП
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const updateData: Record<string, number | string> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.base_salary !== undefined) updateData.base_salary = Number(body.base_salary);
    if (body.revenue_percent !== undefined) updateData.revenue_percent = Number(body.revenue_percent);
    if (body.margin_percent !== undefined) updateData.margin_percent = Number(body.margin_percent);
    if (body.paid_revenue_percent !== undefined) updateData.paid_revenue_percent = Number(body.paid_revenue_percent);
    if (body.plan_threshold !== undefined) updateData.plan_threshold = Number(body.plan_threshold);
    if (body.plan_bonus !== undefined) updateData.plan_bonus = Number(body.plan_bonus);

    const { data, error } = await supabaseAdmin
      .from("salary_rules")
      .update(updateData)
      .eq("shop_id", CURRENT_SHOP_ID)
      .eq("is_default", true)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Неизвестная ошибка",
      },
      { status: 500 }
    );
  }
}