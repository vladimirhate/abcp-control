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
              <p><strong>Выручка:</strong> Сумма поля <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">sum</code> по всем заказам за выбранный период (API: <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">cp/orders</code>).</p>
              <p><strong>Маржа:</strong> Сумма по всем позициям заказов: <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">(priceOut - priceIn) * quantityFinal</code>. Отмененные позиции (<code className="rounded bg-slate-100 px-1 py-0.5 text-xs">isCanceled = 1</code> или <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">2</code>) исключаются.</p>
              <p><strong>Зависшие заказы:</strong> Заказы, которые не оплачены (<code className="rounded bg-slate-100 px-1 py-0.5 text-xs">paid = false</code>) и не обновлялись более 24 часов (по полю <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">dateUpdated</code>). Порог в часах настраивается в разделе "Алерты".</p>
              <p><strong>Утренняя сводка:</strong> Данные по выручке, марже и количеству заказов строго за вчерашний день, независимо от выбранного периода на дашборде.</p>
            </div>
          </div>

          {/* Зарплата */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Расчёт зарплаты (ЗП 2.0)</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p><strong>Базовая формула:</strong> <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">Оклад + (% от выручки) + (% от маржи) + (% за оплаченные) + Бонус за план</code>.</p>
              <p><strong>Методы расчета (настраивается в "Правилах ЗП"):</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>По всем заказам:</strong> В выручку идут все созданные заказы менеджера.</li>
                <li><strong>По оплаченным:</strong> Учитываются только заказы, у которых поле <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">debt</code> (долг) равно 0.</li>
                <li><strong>По выданным:</strong> В выручку идут суммы только тех позиций, чьи статусы (<code className="rounded bg-slate-100 px-1 py-0.5 text-xs">statusCode</code>) отмечены владельцем как "Выдано" в настройках.</li>
              </ul>
              <p><strong>Корректировки (Штрафы / Больничные / Премии):</strong> Владелец может ввести ручную сумму (положительную или отрицательную) и указать причину. Она сохраняется в базе данных на текущий месяц и прибавляется к авто-расчету, формируя "Итого к выдаче".</p>
            </div>
          </div>

          {/* Менеджеры */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Менеджеры (Скорость реакции)</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p><strong>Время реакции:</strong> Разница во времени между датой создания заказа (<code className="rounded bg-slate-100 px-1 py-0.5 text-xs">date</code>) и временем первой смены статуса.</p>
              <p><strong>Логика:</strong> Запрашивается история статусов (API: <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">cp/orders/statusHistory</code>). Система находит самую первую запись о смене статуса, исключая системные автоматические действия (где автор "Система"). Время реакции засчитывается тому менеджеру, который фактически изменил статус (даже если он не является автором заказа). Если это другой менеджер, в таблице появится метка "Другой менеджер".</p>
            </div>
          </div>

          {/* Аналитика клиентов */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Аналитика клиентов (Рейтинг и Отток)</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p><strong>Рейтинг токсичности (A, B, C, D):</strong> Формируется на основе выручки и процента возвратов/отказов клиента.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>A (VIP):</strong> Выручка &gt; 100 000 ₽, возвраты &lt; 10%.</li>
                <li><strong>B (Хороший):</strong> Выручка &gt; 30 000 ₽, возвраты &lt; 20%.</li>
                <li><strong>D (Токсичный):</strong> Процент возвратов &gt; 30% (независимо от выручки).</li>
                <li><strong>C (Стандартный):</strong> Остальные клиенты.</li>
              </ul>
              <p><strong>Учет отказов:</strong> Отказом считается прямая отмена клиентом (<code className="rounded bg-slate-100 px-1 py-0.5 text-xs">isCanceled = 1</code> или <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">2</code>), а также смена статуса позиции на один из тех, что владелец отметил как "Отказы клиентов" в Настройках.</p>
              <p><strong>Уходящие VIP:</strong> Клиенты с выручкой от 30к, которые не делали заказы более 30 дней.</p>
              <p><strong>Снижение активности:</strong> Клиенты с меньшей выручкой, переставшие заказывать более 30 дней назад.</p>
              <p><strong>Массовые действия:</strong> В этих блоках можно выделить клиентов галочками и массово изменить им профиль или статус (заблокировать, удалить) прямо в ABCP.</p>
            </div>
          </div>

          {/* ABC-анализ */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">ABC-анализ ассортимента</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p><strong>Распределение по группам:</strong> Товары сортируются по выручке и распределяются по группам:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Группа A:</strong> Приносят 80% выручки.</li>
                <li><strong>Группа B:</strong> Приносят следующие 15% (итого 95%).</li>
                <li><strong>Группа C:</strong> Приносят оставшиеся 5% выручки.</li>
              </ul>
              <p><strong>Процент возвратов:</strong> Для каждого товара считается отношение отмененных штук к общему количеству проданных. Если товар из группы A имеет высокий процент возвратов, система подсветит его красным и порекомендует найти другого поставщика.</p>
            </div>
          </div>

          {/* Аудит маржи и Отмены */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Аудит маржи и Аналитика отказов</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p><strong>Плановая маржа (Аудит):</strong> Рассчитывается по начальной цене продажи до внесения ручных изменений: <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">(oldPriceOut - priceIn) * quantity</code>.</p>
              <p><strong>Потерянная маржа:</strong> Разница между плановой и фактической маржой. Показывает, сколько прибыли компания недополучила из-за ручных скидок менеджеров (когда <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">priceOut &lt; oldPriceOut</code>).</p>
              <p><strong>Аналитика отказов (Отмены):</strong> Считает потерянную выручку по отмененным позициям. Разделяет отказы на две категории:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Отменили клиенты:</strong> Прямые запросы на отмену (<code className="rounded bg-slate-100 px-1 py-0.5 text-xs">isCanceled = 1</code>) или статусы "Отказ клиента" из настроек.</li>
                <li><strong>Отказы поставщиков / магазина:</strong> Обнуление итогового количества (<code className="rounded bg-slate-100 px-1 py-0.5 text-xs">quantityFinal = 0</code>) или статусы "Отказ поставщика" из настроек.</li>
              </ul>
            </div>
          </div>

          {/* Здоровье поставщиков */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Здоровье поставщиков</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p><strong>Онлайн-поставщик:</strong> Поставщики, передающие цены по API в реальном времени. У них нет даты обновления прайса, они всегда актуальны.</p>
              <p><strong>Прайсовый поставщик:</strong> Проверяется поле <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">updateTime</code> (дата последней загрузки файла).</p>
              <p><strong>Устаревший прайс:</strong> Если с момента <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">updateTime</code> прошло больше дней, чем указано в норме обновления (<code className="rounded bg-slate-100 px-1 py-0.5 text-xs">updateRateInDays</code>), прайс считается устаревшим. Если норма не указана (равна 0), по умолчанию применяется порог в 7 дней.</p>
            </div>
          </div>

          {/* Финансы */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Финансы и риски</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>Данные берутся из карточек клиентов (API: <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">cp/users</code>).</p>
              <p><strong>Общая дебиторка:</strong> Сумма поля <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">debt</code> (долг) всех клиентов.</p>
              <p><strong>Просрочено:</strong> Сумма поля <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">overdueSaldo</code> (просроченная задолженность).</p>
              <p><strong>Исполнение лимита:</strong> Отношение долга (<code className="rounded bg-slate-100 px-1 py-0.5 text-xs">debt</code>) к кредитному лимиту (<code className="rounded bg-slate-100 px-1 py-0.5 text-xs">creditLimit</code>). Если использовано &gt; 80%, клиент подсвечивается красным (статус "Критично").</p>
            </div>
          </div>

          {/* Настройки */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Важность настроек (Сервис -> Алерты)</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>Для того чтобы аналитика отказов, рейтинг клиентов и расчет зарплаты работали максимально точно, владельцу необходимо один раз настроить статусы в разделе <strong>"Алерты"</strong>:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Отметить галочками статусы, которые в вашем магазине считаются "Отказом клиента".</li>
                <li>Отметить статусы, которые считаются "Отказом поставщика".</li>
                <li>В разделе "Правила ЗП" выбрать метод расчета и, если нужно, отметить статусы "Выдано".</li>
              </ul>
              <p>Система будет использовать эти настройки во всех отчетах, где фигурируют возвраты, отмены или финальные выдачи товара.</p>
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}