import { NextResponse } from "next/server";
import { abcpRequest, formatDate } from "@/lib/abcp";

export async function GET() {
  try {
    // Берём последние 30 дней
    const dateStart = new Date();
    dateStart.setDate(dateStart.getDate() - 30);
    dateStart.setHours(0, 0, 0, 0);

    const dateEnd = new Date();
    dateEnd.setHours(23, 59, 59, 0);

    const data = await abcpRequest("cp/orders", {
      dateUpdatedStart: formatDate(dateStart),
      dateUpdatedEnd: formatDate(dateEnd),
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Неизвестная ошибка",
      },
      { status: 500 }
    );
  }
}