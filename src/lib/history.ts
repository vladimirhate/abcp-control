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
  
  console.log(`[History] Начинаем загрузку истории для ${positionIds.length} позиций...`);
  
  const chunkSize = 100;
  for (let i = 0; i < positionIds.length; i += chunkSize) {
    const chunk = positionIds.slice(i, i + chunkSize);
    
    const url = new URL(`${shop.api_url}/cp/orders/statusHistory`);
    url.searchParams.append("userlogin", shop.api_login);
    url.searchParams.append("userpsw", shop.api_password_md5);
    
    chunk.forEach(id => url.searchParams.append("positionsId[]", id));

    try {
      const response = await fetch(url.toString(), { cache: "no-store" });
      
      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      
      if (data && data.positions) {
        // API возвращает массив или объект с числовыми ключами (индексами)
        const positionsArray = Array.isArray(data.positions) ? data.positions : Object.values(data.positions);
        
        positionsArray.forEach((history, index) => {
          const posId = chunk[index]; // Сопоставляем индекс с ID позиции из нашего запроса
          if (posId && history) {
            historyMap[posId] = history as HistoryEntry[];
          }
        });
      }
    } catch (e) {
      console.error("[History] Ошибка загрузки истории статусов:", e);
    }
  }
  
  console.log(`[History] Успешно загружена история для ${Object.keys(historyMap).length} позиций.`);
  return historyMap;
}