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

export async function abcpRequest<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T> {
  const siteUrl = process.env.ABCP_SITE_URL;
  const login = process.env.ABCP_LOGIN;
  const password = process.env.ABCP_PASSWORD;

  if (!siteUrl || !login || !password) {
    throw new Error(
      "Не заполнены переменные ABCP_SITE_URL, ABCP_LOGIN, ABCP_PASSWORD"
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