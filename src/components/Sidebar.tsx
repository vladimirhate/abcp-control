"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Wallet,
  Truck,
  UserCog,
  Tag,
  Package,
  Bell,
  TrendingUp,
  Store,
  AlertTriangle,
  HeartPulse,
  BookOpen,
  XCircle,
  BarChart3,
} from "lucide-react";

type MenuItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
};

type MenuSection = {
  title?: string;
  items: MenuItem[];
};

const menu: MenuSection[] = [
  {
    items: [
      { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
    ],
  },
  {
    title: "Операционка",
    items: [
      { href: "/order", label: "Заказы", icon: ShoppingCart },
      { href: "/managers", label: "Менеджеры", icon: UserCog },
      { href: "/salary", label: "Зарплата", icon: Wallet },
    ],
  },
      {
    title: "Аналитика",
    items: [
      { href: "/clients", label: "Клиенты", icon: Users },
      { href: "/clients-analytics", label: "Аналитика клиентов", icon: TrendingUp },
      { href: "/brands", label: "Бренды", icon: Tag },
      { href: "/articles", label: "Артикулы", icon: Package },
      { href: "/abc-analysis", label: "ABC-анализ", icon: BarChart3 },
      { href: "/suppliers", label: "Поставщики", icon: Truck },
      { href: "/suppliers-health", label: "Здоровье прайсов", icon: HeartPulse },
      { href: "/cancellations", label: "Аналитика отмен", icon: XCircle },
      { href: "/lost-margin", label: "Аудит маржи", icon: AlertTriangle }, 
      { href: "/finance", label: "Финансы", icon: Wallet },
    ],
  },
  {
  title: "Сервис",
  items: [
    { href: "/settings", label: "Мой магазин", icon: Store },
    { href: "/settings/salary", label: "Правила ЗП", icon: Wallet },
    { href: "/settings/alerts", label: "Алерты", icon: Bell },
    { href: "/docs", label: "Документация", icon: BookOpen },
  ],
},
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col bg-slate-900 text-slate-100">
      <div className="flex h-16 items-center border-b border-slate-800 px-6">
        <Link href="/dashboard" className="text-lg font-bold tracking-tight">
          ABCP<span className="text-blue-400">Control</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {menu.map((section, i) => (
          <div key={i} className={i > 0 ? "mt-6" : ""}>
            {section.title && (
              <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {section.title}
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <Icon size={18} className="shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-800 px-6 py-4 text-xs text-slate-500">
        v0.1 · Beta
      </div>
    </aside>
  );
}