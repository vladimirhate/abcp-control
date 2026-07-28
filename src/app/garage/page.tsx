import { abcpRequest, formatDate } from "@/lib/abcp";
import { getShop } from "@/lib/shop";
import { AppLayout } from "@/components/AppLayout";
import { CreateTaskButton } from "@/components/CreateTaskButton";

type Car = {
  id: string;
  userId: string;
  manufacturer: string;
  model: string;
  modification: string;
  year: string;
  vin: string;
  vehicleRegPlate: string;
  mileage: string;
  dateUpdated: string;
};

type User = {
  userId: string;
  name: string;
  organizationName: string;
};

export default async function GaragePage() {
  let cars: Car[] = [];
  let usersMap: Record<string, string> = {};
  let error: string | null = null;

  try {
    const shop = await getShop();
    if (!shop) throw new Error("Магазин не найден в БД");

    const dateStart = new Date();
    dateStart.setFullYear(dateStart.getFullYear() - 2);
    
    // Загружаем данные
    const [carsData, usersData] = await Promise.all([
      abcpRequest<any>("cp/garage", {
        dateUpdatedStart: formatDate(dateStart),
        dateUpdatedEnd: formatDate(new Date()),
      }, {
        api_url: shop.api_url, api_login: shop.api_login, api_password_md5: shop.api_password_md5,
      }),
      abcpRequest<User[]>("cp/users", { limit: "1000", state: "1" }, {
        api_url: shop.api_url, api_login: shop.api_login, api_password_md5: shop.api_password_md5,
      })
    ]);

         // API возвращает объект, где ключ - userId, а значение - массив машин
    if (typeof carsData === 'object' && carsData !== null) {
      // Если это объект, вытаскиваем все массивы машин в один плоский список
      const allCars = Object.values(carsData).flat();
      cars = allCars as Car[];
    } else if (Array.isArray(carsData)) {
      // На всякий случай оставим проверку массива
      cars = carsData as Car[];
    } else {
      throw new Error("Неверный формат данных от API гаража");
    }

    // Собираем карту клиентов
    if (Array.isArray(usersData)) {
      usersData.forEach(u => {
        usersMap[u.userId] = u.organizationName || u.name || "Клиент " + u.userId;
      });
    }

    // Агрегация: Топ марок и моделей
    const brandMap = new Map<string, number>();
    const modelMap = new Map<string, number>();

    for (const car of cars) {
      if (car.manufacturer) {
        brandMap.set(car.manufacturer, (brandMap.get(car.manufacturer) || 0) + 1);
      }
      if (car.manufacturer && car.model) {
        const fullName = `${car.manufacturer} ${car.model}`;
        modelMap.set(fullName, (modelMap.get(fullName) || 0) + 1);
      }
    }

    const topBrands = Array.from(brandMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topModels = Array.from(modelMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return (
      <AppLayout>
        <div className="mx-auto max-w-7xl">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Гараж клиентов</h1>
            <p className="mt-1 text-sm text-slate-500">
              Автомобили клиентов: статистика для закупок и предложения ТО
            </p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Топ марок */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900 mb-4">Топ марок автомобилей</h2>
              <div className="space-y-3">
                {topBrands.length === 0 && <p className="text-sm text-slate-500">Нет данных</p>}
                {topBrands.map(([brand, count], idx) => (
                  <div key={brand} className="flex items-center gap-3">
                    <span className="w-6 text-sm font-bold text-slate-400">{idx + 1}</span>
                    <span className="flex-1 text-sm font-medium text-slate-900">{brand}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-blue-500" style={{ width: `${(count / topBrands[0][1]) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-600 w-12 text-right">{count} шт.</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Топ моделей */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900 mb-4">Топ моделей (для закупки ТО)</h2>
              <div className="space-y-3">
                {topModels.length === 0 && <p className="text-sm text-slate-500">Нет данных</p>}
                {topModels.map(([model, count], idx) => (
                  <div key={model} className="flex items-center gap-3">
                    <span className="w-6 text-sm font-bold text-slate-400">{idx + 1}</span>
                    <span className="flex-1 text-sm font-medium text-slate-900">{model}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-green-500" style={{ width: `${(count / topModels[0][1]) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-600 w-12 text-right">{count} шт.</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Список машин */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="font-semibold text-slate-900">Все автомобили в гараже ({cars.length})</h2>
              <p className="text-xs text-slate-500 mt-1">Сортировка по последнему обновлению. Нажмите "Задача", чтобы предложить клиенту ТО.</p>
            </div>
            {cars.length === 0 ? (
              <div className="p-6 text-center text-slate-500">Нет данных о машинах.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="px-4 py-3 font-medium">Клиент</th>
                      <th className="px-4 py-3 font-medium">Автомобиль</th>
                      <th className="px-4 py-3 font-medium">Год</th>
                      <th className="px-4 py-3 font-medium">Госномер / VIN</th>
                      <th className="px-4 py-3 font-medium">Пробег</th>
                      <th className="px-4 py-3 font-medium">Обновлен</th>
                      <th className="px-4 py-3 font-medium">Действие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cars.slice(0, 200).map((car) => {
                      const clientName = usersMap[car.userId] || "Клиент " + car.userId;
                      const carName = `${car.manufacturer || ""} ${car.model || ""}`.trim() || "Неизвестно";
                      const mileage = Number(car.mileage || 0);
                      
                      return (
                        <tr key={car.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900 max-w-[150px] truncate">{clientName}</td>
                          <td className="px-4 py-3 text-slate-700">{carName}</td>
                          <td className="px-4 py-3 text-slate-700">{car.year || "—"}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {car.vehicleRegPlate && <div>{car.vehicleRegPlate}</div>}
                            {car.vin && <div className="text-slate-400">{car.vin}</div>}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {mileage > 0 ? `${mileage.toLocaleString("ru-RU")} км` : "—"}
                            {mileage > 15000 && <span className="ml-2 text-amber-600 text-xs">(Возможно ТО)</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{car.dateUpdated || "—"}</td>
                          <td className="px-4 py-3">
                            <CreateTaskButton clientId={car.userId} clientName={clientName} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    );
  } catch (e: any) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold text-slate-900">Гараж клиентов</h1>
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            Ошибка: {e?.message || "Неизвестная ошибка при загрузке данных"}
          </div>
        </div>
      </AppLayout>
    );
  }
}