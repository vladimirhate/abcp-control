import { NextResponse } from "next/server";
import { abcpRequest } from "@/lib/abcp";
import { getShop } from "@/lib/shop";

export async function GET() {
  try {
    const shop = await getShop();
    if (!shop) throw new Error("Магазин не найден в БД");

    // В ABCP может быть два эндпоинта: cp/statuses или cp/orders/statuses
    // Попробуем cp/orders/statuses, так как он чаще используется для позиций заказов
    const data = await abcpRequest<any[]>("cp/orders/statuses", {}, {
      api_url: shop.api_url,
      api_login: shop.api_login,
      api_password_md5: shop.api_password_md5,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Ошибка загрузки статусов:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Ошибка при загрузке статусов" },
      { status: 500 }
    );
  }
}