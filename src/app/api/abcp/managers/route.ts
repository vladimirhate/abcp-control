import { NextResponse } from "next/server";
import { abcpRequest } from "@/lib/abcp";

export async function GET() {
  try {
    const data = await abcpRequest("cp/managers");
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