type ShopCredentials = {
  api_url: string;
  api_login: string;
  api_password_md5: string;
};

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

export async function abcpRequest<T>(
  endpoint: string,
  params: Record<string, string> = {},
  credentials?: ShopCredentials
): Promise<T> {
  const siteUrl = credentials?.api_url || process.env.ABCP_SITE_URL;
  const login = credentials?.api_login || process.env.ABCP_LOGIN;
  const password = credentials?.api_password_md5 || process.env.ABCP_PASSWORD;

  if (!siteUrl || !login || !password) {
    throw new Error("Не заданы данные для подключения к API ABCP");
  }

  const searchParams = new URLSearchParams({
    userlogin: login,
    userpsw: password,
    ...params,
  });

  const url = `${siteUrl}/${endpoint}?${searchParams.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8500);

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorDetails = `${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.errorMessage) {
          errorDetails += ` - ${errorData.errorMessage}`;
        } else if (errorData && errorData.message) {
          errorDetails += ` - ${errorData.message}`;
        } else {
          errorDetails += ` - ${JSON.stringify(errorData)}`;
        }
      } catch (e) {
        // Если ответ не JSON
      }
      throw new Error(`Ошибка API ABCP: ${errorDetails}`);
    }

    const data = await response.json();
    return data as T;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error("Время ожидания истекло. Выберите период короче, сервер ABCP не успел отдать данные.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function hoursSince(dateStr: string): number {
  if (!dateStr) return 0;
  const isoDate = dateStr.replace(" ", "T");
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return 0;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60));
}

export function isStuckOrder(dateUpdated: string, thresholdHours: number = 24): boolean {
  const hours = hoursSince(dateUpdated);
  return hours >= thresholdHours;
}

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