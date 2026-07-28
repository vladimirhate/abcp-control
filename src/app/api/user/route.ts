import { NextRequest, NextResponse } from "next/server";
import { getShop } from "@/lib/shop";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const shop = await getShop();
    if (!shop) throw new Error("Магазин не найден");

    const body = await request.json();
    const { userId, managerComment, inStopList } = body;

    // Формируем параметры для ABCP
    const params = new URLSearchParams();
    params.append("userlogin", shop.api_login);
    params.append("userpsw", shop.api_password_md5);
    params.append("userId", userId);
    
    if (managerComment !== undefined) params.append("managerComment", managerComment);
    if (inStopList !== undefined) params.append("inStopList", inStopList ? "1" : "0");

    const response = await fetch(`${shop.api_url}/cp/user`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ошибка API ABCP: ${text}`);
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}