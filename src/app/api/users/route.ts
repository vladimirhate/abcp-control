import { NextRequest, NextResponse } from "next/server";
import { abcpRequest } from "@/lib/abcp";
import { getShop } from "@/lib/shop";

export async function GET(request: NextRequest) {
  try {
    const shop = await getShop();
    if (!shop) throw new Error("Магазин не найден");

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const profileId = searchParams.get("profileId");
    const state = searchParams.get("state");
    const business = searchParams.get("business");
    
    // Пагинация
    const page = Number(searchParams.get("page") || "0");
    const limit = 100; // Загружаем по 100 за раз
    const skip = page * limit;

    const params: Record<string, string> = { 
      limit: String(limit),
      skip: String(skip) 
    };
    
    if (profileId) params.profileId = profileId;
    if (state) params.state = state;
    
    let data = await abcpRequest<any[]>("cp/users", params, {
      api_url: shop.api_url, api_login: shop.api_login, api_password_md5: shop.api_password_md5,
    });

    // Фильтры, которые ABCP не умеет делать через API, делаем на нашей стороне
    if (business) {
      data = data.filter(u => u.business === business);
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      data = data.filter(u => 
        (u.name && u.name.toLowerCase().includes(lowerSearch)) ||
        (u.organizationName && u.organizationName.toLowerCase().includes(lowerSearch)) ||
        (u.email && u.email.toLowerCase().includes(lowerSearch)) ||
        (u.mobile && u.mobile.includes(search))
      );
    }

    return NextResponse.json({ success: true, data, hasMore: data.length === limit });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}