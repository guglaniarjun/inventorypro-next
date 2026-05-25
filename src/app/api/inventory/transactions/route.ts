import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, AppSessionData } from "@/lib/session";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

const STOCK_IN_TYPES = ["Purchase/Stock In", "Return", "Transfer"];
const STOCK_OUT_TYPES = ["Usage/Stock Out", "Issue to Staff", "Damage", "Discard/Scrap", "Transfer"];

export async function GET(req: NextRequest) {
  const res = new NextResponse();
  const session = await getIronSession<AppSessionData>(req, res, sessionOptions);
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const itemId = searchParams.get("itemId");
  const txType = searchParams.get("type");
  const departmentId = searchParams.get("departmentId");
  const skip = (page - 1) * limit;

  const where = {
    tenantId: session.user.tenantId ?? undefined,
    ...(itemId ? { itemId: parseInt(itemId) } : {}),
    ...(txType ? { transactionType: txType } : {}),
    ...(departmentId ? { departmentId: parseInt(departmentId) } : {}),
  };

  const [transactions, total] = await Promise.all([
    prisma.stockTransaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        item: { select: { itemName: true, itemCode: true } },
        department: { select: { departmentName: true } },
        fromDepartment: { select: { departmentName: true } },
        toDepartment: { select: { departmentName: true } },
      },
    }),
    prisma.stockTransaction.count({ where }),
  ]);

  return NextResponse.json({
    data: transactions.map((t) => ({
      ...t,
      itemName: t.item.itemName,
      itemCode: t.item.itemCode,
      departmentName: t.department.departmentName,
      fromDepartmentName: t.fromDepartment?.departmentName ?? null,
      toDepartmentName: t.toDepartment?.departmentName ?? null,
    })),
    total,
    page,
    limit,
  });
}

export async function POST(req: NextRequest) {
  const res = new NextResponse();
  const session = await getIronSession<AppSessionData>(req, res, sessionOptions);
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    itemId?: number; transactionType?: string; quantity?: number;
    transactionDate?: string; remarks?: string;
    fromDepartmentId?: number; toDepartmentId?: number;
    fromLocationId?: number; toLocationId?: number;
  };

  if (!body.itemId || !body.transactionType || !body.quantity || !body.transactionDate) {
    return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
  }

  const item = await prisma.inventoryItem.findFirst({
    where: { id: body.itemId, tenantId: session.user.tenantId ?? undefined },
  });

  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const isIn = STOCK_IN_TYPES.includes(body.transactionType) && body.transactionType !== "Transfer";
  const isTransfer = body.transactionType === "Transfer";
  const qty = Math.abs(body.quantity);
  const delta = isIn ? qty : isTransfer ? 0 : -qty;
  const afterStock = item.currentStock + delta;

  if (!isIn && !isTransfer && afterStock < 0) {
    return NextResponse.json({ error: "Insufficient stock" }, { status: 400 });
  }

  const [tx] = await prisma.$transaction([
    prisma.stockTransaction.create({
      data: {
        tenantId: session.user.tenantId!,
        itemId: body.itemId,
        departmentId: item.departmentId,
        transactionType: body.transactionType,
        quantity: isIn ? qty : isTransfer ? qty : -qty,
        beforeStock: item.currentStock,
        afterStock,
        fromDepartmentId: body.fromDepartmentId ?? null,
        toDepartmentId: body.toDepartmentId ?? null,
        fromLocationId: body.fromLocationId ?? null,
        toLocationId: body.toLocationId ?? null,
        transactionDate: new Date(body.transactionDate),
        remarks: body.remarks ?? null,
        enteredBy: session.user.id,
        approvalStatus: "Not Required",
      },
    }),
    prisma.inventoryItem.updateMany({
      where: { id: body.itemId },
      data: { currentStock: afterStock },
    }),
  ]);

  await logActivity({
    user: session.user,
    actionType: "TRANSACTION",
    module: "Inventory",
    recordId: tx.id,
    description: `${body.transactionType}: ${qty} ${item.unit} of ${item.itemName}`,
  });

  return NextResponse.json(tx, { status: 201 });
}
