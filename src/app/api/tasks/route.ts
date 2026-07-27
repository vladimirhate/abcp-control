import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase/server";
import { getShop } from "@/lib/shop";

// GET — получить список задач
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const shop = await getShop();
    if (!shop) throw new Error("Магазин не найден");

    const { data, error } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST — создать новую задачу
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const shop = await getShop();
    if (!shop) throw new Error("Магазин не найден");

    const body = await request.json();

    const { data, error } = await supabaseAdmin
      .from("tasks")
      .insert({
        shop_id: shop.id,
        assigned_to: body.assigned_to || "all",
        created_by: user.email,
        title: body.title,
        description: body.description,
        related_client_id: body.related_client_id,
        related_client_name: body.related_client_name,
        status: "open",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}