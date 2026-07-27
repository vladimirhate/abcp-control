import { AppLayout } from "@/components/AppLayout";

export default function DocsPage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Методология и расчеты</h1>
          <p className="mt-1 text-sm text-slate-500">
            Описание метрик, логики расчетов и источников данных для аналитики
          </p>
        </div>

        <div className="mt-8 space-y-6">
          
          {/* Дашборд */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Дашборд</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p><strong>Выручка:</strong> Сумма поля <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">sum</code> по всем заказам за период (API: <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">cp/orders</code>).</p>
              <p><strong>Маржа:</strong> Сумма по всем позициям заказов: <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">(priceOut - priceIn) * quantityFinal</code>. Отмененные позиции (<code className="rounded bg-slate-100 px-1 py-0.5 text-xs">isCanceled = 1</code>) исключаются.</p>
              <p><strong>Зависшие заказы:</strong> Заказы, которые не оплачены (<code className="rounded bg-slate-100 px-1 py-0.5 text-xs">paid = false</code>) и не обновлялись более 24 часов (по полю <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">dateUpdated</code>).</p>
            </div>
          </div>

          {/* Аудит маржи */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Аудит потерянной маржи</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p><strong>Плановая маржа:</strong> Рассчитывается по начальной цене продажи до внесения ручных изменений: <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">(oldPriceOut - priceIn) * quantity</code>.</p>
              <p><strong>Фактическая маржа:</strong> Рассчитывается по итоговой цене продажи: <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">(priceOut - priceIn) * quantity</code>.</p>
              <p><strong>Потерянная маржа:</strong> Разница между плановой и фактической маржой. Показывает, сколько прибыли компания недополучила из-за ручных скидок менеджеров.</p>
            </div>
          </div>

          {/* Менеджеры */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Менеджеры (Скорость реакции)</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p><strong>Время реакции:</strong> Разница во времени между датой создания заказа (<code className="rounded bg-slate-100 px-1 py-0.5 text-xs">date</code>) и временем первой смены статуса любой позиции в этом заказе.</p>
              <p><strong>Источник данных:</strong> Пакетный запрос истории статусов (API: <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">cp/orders/statusHistory</code>). Запросы отправляются батчами по 100 позиций для оптимизации скорости.</p>
            </div>
          </div>

          {/* Здоровье поставщиков */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Здоровье поставщиков</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p><strong>Онлайн-поставщик:</strong> Поставщики, передающие цены и наличие по API в реальном времени. У них нет даты обновления прайса, они всегда "живые".</p>
              <p><strong>Прайсовый поставщик:</strong> Поставщики, загружающие файлы (Excel/CSV). Проверяется поле <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">updateTime</code>.</p>
              <p><strong>Устаревший прайс:</strong> Если с момента <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">updateTime</code> прошло больше дней, чем указано в норме обновления (<code className="rounded bg-slate-100 px-1 py-0.5 text-xs">updateRateInDays</code>), прайс считается устаревшим. Если норма не указана, по умолчанию применяется порог в 7 дней.</p>
            </div>
          </div>

          {/* Клиенты */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Аналитика клиентов</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p><strong>Уходящие клиенты:</strong> Клиенты, которые делали заказы ранее, но за последние 30 дней не сделали ни одного заказа. Сортируются по общей выручке, чтобы в первую очередь обращать внимание на VIP-клиентов.</p>
              <p><strong>Снижение активности:</strong> Клиенты, которые активно заказывали в первой половине периода (первые 45 дней), но перестали заказывать во второй половине.</p>
              <p><strong>Новички без покупок:</strong> Зарегистрированные пользователи (API: <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">cp/users</code>), которые зарегистрировались более 7 дней назад, но не сделали ни одного заказа.</p>
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}