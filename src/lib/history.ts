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
  
  const chunkSize = 100;
  for (let i = 0; i < positionIds.length; i += chunkSize) {
    const chunk = positionIds.slice(i, i + chunkSize);
    
    const url = new URL(`${shop.api_url}/cp/orders/statusHistory`);
    url.searchParams.append("userlogin", shop.api_login);
    url.searchParams.append("userpsw", shop.api_password_md5);
    
    chunk.forEach(id => url.searchParams.append("positionsId[]", id));

    try {
      const response = await fetch(url.toString(), { cache: "no-store" });
      if (!response.ok) continue;

      const data = await response.json();
      
      if (data && data.positions) {
        const positionsArray = Array.isArray(data.positions) ? data.positions : Object.values(data.positions);
        
        positionsArray.forEach((historyItem: any) => {
          // Ищем ID позиции. Может быть в самом объекте, или берем по индексу
          const posId = historyItem.id ? String(historyItem.id) : chunk[positionsArray.indexOf(historyItem)];
          if (posId && historyItem.statuses && Array.isArray(historyItem.statuses)) {
            historyMap[posId] = historyItem.statuses as HistoryEntry[];
          }
        });
      }
    } catch (e) {
      console.error("Ошибка загрузки истории статусов:", e);
    }
  }
  
  return historyMap;
}