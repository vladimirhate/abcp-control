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
    const { userIds, profileId, state } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "Не выбраны клиенты" }, { status: 400 });
    }

    let successCount = 0;
    let errorCount = 0;

    // ABCP принимает только по одному клиенту за раз, поэтому запускаем цикл
    for (const userId of userIds) {
      const params = new URLSearchParams();
      params.append("userId", String(userId));
      if (profileId !== undefined) params.append("profileId", String(profileId));
      if (state !== undefined) params.append("state", String(state));

      try {
        const response = await fetch(`${shop.api_url}/cp/user?userlogin=${shop.api_login}&userpsw=${shop.api_password_md5}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString()
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (e) {
        errorCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Обновлено: ${successCount}. Ошибок: ${errorCount}.` 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}