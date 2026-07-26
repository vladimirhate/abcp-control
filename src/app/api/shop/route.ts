import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CURRENT_SHOP_ID } from "@/lib/shop";

// GET — получить данные магазина
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("shops")
      .select("*")
      .eq("id", CURRENT_SHOP_ID)
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

// PUT — обновить данные магазина
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const updateData: Record<string, string> = {};
    if (body.name) updateData.name = body.name;
    if (body.api_url) updateData.api_url = body.api_url;
    if (body.api_login) updateData.api_login = body.api_login;
    if (body.api_password_md5) updateData.api_password_md5 = body.api_password_md5;

    const { data, error } = await supabaseAdmin
      .from("shops")
      .update(updateData)
      .eq("id", CURRENT_SHOP_ID)
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