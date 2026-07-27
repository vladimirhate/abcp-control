export type DateRange = { dateStart: Date; dateEnd: Date };

export function getRange(period: string, from?: string, to?: string): DateRange {
  const dateEnd = new Date();
  dateEnd.setHours(23, 59, 59, 0);

  const dateStart = new Date();

  // Если переданы кастомные даты (из календаря)
  if (from && to) {
    const customStart = new Date(from);
    const customEnd = new Date(to);
    if (!isNaN(customStart.getTime()) && !isNaN(customEnd.getTime())) {
      customStart.setHours(0, 0, 0, 0);
      customEnd.setHours(23, 59, 59, 0);
      return { dateStart: customStart, dateEnd: customEnd };
    }
  }

  // Пресеты
  switch (period) {
    case "last7":
      dateStart.setDate(dateStart.getDate() - 7);
      break;
    case "last14":
      dateStart.setDate(dateStart.getDate() - 14);
      break;
    case "this_month":
      dateStart.setDate(1);
      break;
    case "prev_month":
      dateStart.setMonth(dateStart.getMonth() - 1);
      dateStart.setDate(1);
      dateEnd.setTime(dateStart.getTime());
      dateEnd.setMonth(dateEnd.getMonth() + 1);
      dateEnd.setDate(0); // Последний день предыдущего месяца
      break;
        case "last6months":
      dateStart.setMonth(dateStart.getMonth() - 6);
      break;
    case "last90":
      dateStart.setDate(dateStart.getDate() - 90);
      break;
    case "quarter": // Оставим для обратной совместимости
      dateStart.setDate(dateStart.getDate() - 90);
      break;
    case "month": // Оставим для обратной совместимости
      dateStart.setDate(dateStart.getDate() - 30);
      break;
    default:
      dateStart.setDate(dateStart.getDate() - 30);
  }

  dateStart.setHours(0, 0, 0, 0);
  return { dateStart, dateEnd };
}