import { abcpRequest } from "@/lib/abcp";
import { getShop } from "@/lib/shop";
import { AppLayout } from "@/components/AppLayout";
import { ClientsCrm } from "@/components/ClientsCrm";

type Profile = { profileId: string; name: string; };

async function getProfiles(): Promise<Profile[]> {
  const shop = await getShop();
  if (!shop) throw new Error("Магазин не найден");
  return abcpRequest<Profile[]>("cp/users/profiles", {}, {
    api_url: shop.api_url, api_login: shop.api_login, api_password_md5: shop.api_password_md5,
  });
}

export default async function ClientsPage() {
  let profiles: Profile[] = [];
  let error: string | null = null;

  try {
    profiles = await getProfiles();
  } catch (e) {
    error = e instanceof Error ? e.message : "Ошибка загрузки профилей";
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">База клиентов (CRM)</h1>
          <p className="mt-1 text-sm text-slate-500">
            Фильтрация по профилям, статусам и бизнесу. Массовое управление.
          </p>
        </div>
        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">Ошибка: {error}</div>
        ) : (
          <ClientsCrm profiles={profiles} />
        )}
      </div>
    </AppLayout>
  );
}