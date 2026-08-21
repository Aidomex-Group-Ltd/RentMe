export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import prisma from "@/lib/prisma";

const SENSITIVE_KEY = /secret|password|token|private|credential|database_url|api[_-]?key/i;

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key);
}

function maskValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    if (value.length <= 4) return "••••";
    return `${value.slice(0, 2)}••••${value.slice(-2)}`;
  }
  if (typeof value === "object") return { masked: true };
  return "••••";
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const settings = await prisma.systemSetting.findMany({
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });

    const safe = settings.map((s) => ({
      ...s,
      value: isSensitiveKey(s.key) ? maskValue(s.value) : s.value,
      sensitive: isSensitiveKey(s.key),
    }));

    return NextResponse.json({ settings: safe });
  } catch (error) {
    console.error("Admin settings GET error:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { key, value, category } = await req.json();
    if (!key || value === undefined) {
      return NextResponse.json({ error: "key and value are required" }, { status: 400 });
    }

    if (isSensitiveKey(String(key))) {
      return NextResponse.json(
        { error: "Sensitive settings cannot be modified from this console" },
        { status: 400 }
      );
    }

    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value, ...(category && { category }) },
      create: { key, value, category: category || null },
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        action: "UPDATE",
        entity: "SystemSetting",
        entityId: setting.id,
        newData: { key, category: category || null },
      },
    });

    return NextResponse.json({ setting });
  } catch (error) {
    console.error("Admin settings PUT error:", error);
    return NextResponse.json({ error: "Failed to update setting" }, { status: 500 });
  }
}
