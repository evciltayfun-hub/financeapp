import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.asset.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name } = await req.json();
    const asset = await prisma.asset.update({
      where: { id },
      data: { ...(name !== undefined && { name }) },
      include: { lots: true },
    });
    return NextResponse.json(asset);
  } catch {
    return NextResponse.json({ error: "Failed to update asset" }, { status: 500 });
  }
}
