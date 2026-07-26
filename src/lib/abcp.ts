export type OrderPosition = {
  id: string;
  brand: string;
  description: string;
  quantity: string;
  quantityFinal: string;
  priceIn: number;
  priceOut: number;
  status: string;
  statusCode: string;
  isCanceled: string;
};

export function calcPositionMargin(pos: OrderPosition): number {
  // Считаем маржу только по неотменённым позициям
  if (pos.isCanceled === "1") return 0;

  const qty = Number(pos.quantityFinal || pos.quantity || 0);
  const priceIn = Number(pos.priceIn || 0);
  const priceOut = Number(pos.priceOut || 0);

  return (priceOut - priceIn) * qty;
}

export function calcOrderMargin(positions: OrderPosition[] | undefined): number {
  if (!positions || positions.length === 0) return 0;
  return positions.reduce((sum, pos) => sum + calcPositionMargin(pos), 0);
}
// Форматируем дату в формат ABCP: "2025-01-15 00:00:00"
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");

  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

type ShopCredentials = {
  api_url: string;
  api_login: string;
  api_password_md5: string;
};

export async function abcpRequest<T>(
  endpoint: string,
  params: Record<string, string> = {},
  credentials?: ShopCredentials
): Promise<T> {
  // Если credentials переданы — используем их (из БД)
  // Иначе — fallback на переменные окружения (для тестов)
  const siteUrl = credentials?.api_url || process.env.ABCP_SITE_URL;
  const login = credentials?.api_login || process.env.ABCP_LOGIN;
  const password = credentials?.api_password_md5 || process.env.ABCP_PASSWORD;

  if (!siteUrl || !login || !password) {
    throw new Error(
      "Не заданы данные для подключения к API ABCP"
    );
  }

  const searchParams = new URLSearchParams({
    userlogin: login,
    userpsw: password,
    ...params,
  });

  const url = `${siteUrl}/${endpoint}?${searchParams.toString()}`;

  console.log("Запрос к API:", url);

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Ошибка API: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data as T;
}
// Сколько часов прошло с даты обновления
export function hoursSince(dateStr: string): number {
  if (!dateStr) return 0;

  // Формат даты из API: "2026-07-15 13:16:29"
  // Заменяем пробел на T для корректного парсинга
  const isoDate = dateStr.replace(" ", "T");
  const date = new Date(isoDate);

  if (isNaN(date.getTime())) return 0;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60));
}

// Проверяем, завис ли заказ
export function isStuckOrder(dateUpdated: string, thresholdHours: number = 24): boolean {
  const hours = hoursSince(dateUpdated);
  return hours >= thresholdHours;
}