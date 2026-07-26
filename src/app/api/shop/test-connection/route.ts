import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { api_url, api_login, api_password_md5 } = body;

    if (!api_url || !api_login || !api_password_md5) {
      return NextResponse.json(
        { success: false, error: "Заполните все поля" },
        { status: 400 }
      );
    }

    const searchParams = new URLSearchParams({
      userlogin: api_login,
      userpsw: api_password_md5,
    });

    const url = `${api_url}/cp/managers?${searchParams.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Ошибка API: ${response.status} ${response.statusText}`,
        },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (data && data.errorCode) {
      return NextResponse.json(
        {
          success: false,
          error: `Ошибка ABCP: ${data.errorMessage || "Неверные данные"}`,
        },
        { status: 500 }
      );
    }

    const managersCount = Array.isArray(data) ? data.length : 0;

    return NextResponse.json({
      success: true,
      message: `Подключение работает! Найдено менеджеров: ${managersCount}`,
      managersCount,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Ошибка подключения",
      },
      { status: 500 }
    );
  }
}