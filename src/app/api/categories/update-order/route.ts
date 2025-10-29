import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { updates } = body as {
      updates: Array<{ id: string; groupType: string | null; displayOrder: number | null }>;
    };

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: "Invalid updates format" }, { status: 400 });
    }

    // Update categories in a transaction
    await prisma.$transaction(
      updates.map((update) =>
        prisma.category.update({
          where: { id: update.id },
          data: {
            groupType: update.groupType,
            displayOrder: update.displayOrder,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating category order:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
