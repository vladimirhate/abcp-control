import { getShop } from "./shop";

type HistoryEntry = {
  datetime: string;
  statusCode: string;
  status: string;
  managerId: string;
  managerName: string;
};

export type StatusHistory = Record<string, HistoryEntry[]>;

export async function fetchStatusHistory(positionIds: string[]): Promise<StatusHistory> {
  const shop = await getShop();
  if (!shop) throw new Error("Магазин не найден в БД");

  const historyMap: StatusHistory = {};
  
  console.log(`[HISTORY DEBUG] Запрашиваем историю для ${positionIds.length} позиций...`);
  
  const chunkSize = 100;
  for (let i = 0; i < positionIds.length; i += chunkSize) {
    const chunk = positionIds.slice(i, i + chunkSize);
    
    const url = new URL(`${shop.api_url}/cp/orders/statusHistory`);
    url.searchParams.append("userlogin", shop.api_login);
    url.searchParams.append("userpsw", shop.api_password_md5);
    
    chunk.forEach(id => url.searchParams.append("positionsId[]", id));

    try {
      const response = await fetch(url.toString(), { cache: "no-store" });
      console.log(`[HISTORY DEBUG] Запрос батча. Статус: ${response.status}`);
      
      if (!response.ok) continue;

      const data = await response.json();
      console.log(`[HISTORY DEBUG] Структура ответа:`, Object.keys(data));
      
      if (data && data.positions) {
        // Если это массив
        if (Array.isArray(data.positions)) {
          console.log(`[HISTORY DEBUG] data.positions - это МАССИВ, длина: ${data.positions.length}`);
          data.positions.forEach((history: any, index: number) => {
            const posId = chunk[index];
            if (posId && history) {
              historyMap[posId] = history as HistoryEntry[];
            }
          });
        } 
        // Если это объект
        else {
          console.log(`[HISTORY DEBUG] data.positions - это ОБЪЕКТ, ключи:`, Object.keys(data.positions).slice(0, 5));
          for (const [posId, history] of Object.entries(data.positions)) {
            if (history) {
              historyMap[posId] = history as HistoryEntry[];
            }
          }
        }
      } else {
        console.log(`[HISTORY DEBUG] В ответе нет узла positions! Вот ответ:`, JSON.stringify(data).slice(0, 200));
      }
    } catch (e) {
      console.error("[HISTORY DEBUG] Ошибка:", e);
    }
  }
  
  console.log(`[HISTORY DEBUG] Успешно извлечена история для ${Object.keys(historyMap).length} позиций.`);
  return historyMap;
}