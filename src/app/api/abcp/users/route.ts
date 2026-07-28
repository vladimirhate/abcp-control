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

    // В ABCP логин и пароль передаются в URL, а остальные параметры в теле
    const url = new URL(`${shop.api_url}/cp/user`);
    url.searchParams.append("userlogin", shop.api_login);
    url.searchParams.append("userpsw", shop.api_password_md5);

    const params = new URLSearchParams();
    params.append("userId", String(userId));
    if (managerComment !== undefined) params.append("managerComment", managerComment);
    if (inStopList !== undefined) params.append("inStopList", inStopList ? "1" : "0");

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });

    // Читаем ответ как текст, чтобы не упасть, если вернулся HTML
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // Если это не JSON, значит ABCP вернул ошибку (например 404 или 500)
      throw new Error(`Сервер ABCP вернул ошибку (статус ${response.status}). Проверьте права API-администратора.`);
    }

    if (data && data.errorCode) {
      throw new Error(`Ошибка ABCP: ${data.errorMessage || 'Неизвестная ошибка'}`);
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}