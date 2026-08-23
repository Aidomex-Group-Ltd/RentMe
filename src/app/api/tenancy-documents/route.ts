import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenancyAccess } from "@/lib/rbac";
import prisma from "@/lib/prisma";

// GET /api/tenancy-documents - List documents for a tenancy
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const tenancyId = searchParams.get("tenancyId");
    const category = searchParams.get("category");

    if (!tenancyId) {
      return NextResponse.json({ error: "tenancyId is required" }, { status: 400 });
    }

    const { allowed, error: accessError } = await requireTenancyAccess(auth.session, tenancyId);
    if (accessError) return accessError;
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const where: any = { tenancyId };
    if (category) where.category = category;

    const documents = await prisma.tenancyDocument.findMany({
      where,
      include: {
        uploader: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Documents fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

// POST /api/tenancy-documents - Upload a document
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await req.json();
    const { tenancyId, name, category, url, fileSize, mimeType } = body;

    if (!tenancyId || !name || !url) {
      return NextResponse.json(
        { error: "tenancyId, name, and url are required" },
        { status: 400 }
      );
    }

    const { allowed, error: accessError } = await requireTenancyAccess(auth.session, tenancyId);
    if (accessError) return accessError;
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const document = await prisma.tenancyDocument.create({
      data: {
        tenancyId,
        uploaderId: auth.session.user.id,
        name: name.trim().slice(0, 200),
        category: category || null,
        url,
        fileSize: fileSize || null,
        mimeType: mimeType || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        action: "DOCUMENT_UPLOADED",
        entity: "TenancyDocument",
        entityId: document.id,
        newData: { tenancyId, name, category },
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}

// DELETE /api/tenancy-documents - Delete a document
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");
    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    const document = await prisma.tenancyDocument.findUnique({
      where: { id: documentId },
    });
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Only uploader or property manager can delete
    const { allowed, error: accessError } = await requireTenancyAccess(
      auth.session,
      document.tenancyId
    );
    if (accessError) return accessError;
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.tenancyDocument.delete({ where: { id: documentId } });

    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        action: "DOCUMENT_DELETED",
        entity: "TenancyDocument",
        entityId: documentId,
        oldData: document,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Document delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
