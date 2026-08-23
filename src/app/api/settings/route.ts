import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/rbac";
import prisma from "@/lib/prisma";

/**
 * GET /api/settings - Get user notification preferences and landlord settings
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const userId = auth.session.user.id;

    // Fetch or create notification preferences
    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: { userId },
      });
    }

    // Fetch landlord settings (stored in user's landlord record or custom JSON)
    // For now, we use a simple approach: store custom settings in AuditLog or a dedicated record
    // We'll check if there's any custom settings data
    const landlord = await prisma.landlord.findUnique({
      where: { userId },
      select: { responseRate: true, responseTimeHours: true },
    });

    // For rent reminder configuration, we'll use a convention:
    // Store as JSON in a system notification or use a simple approach
    // Here we define sensible defaults and let the page manage them

    return NextResponse.json({
      preferences,
      landlord: landlord || null,
    });
  } catch (error) {
    console.error("Settings fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings - Update notification preferences and landlord settings
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const userId = auth.session.user.id;
    const body = await req.json();
    const { preferences, landlord } = body;

    // Update notification preferences
    if (preferences && typeof preferences === "object") {
      const allowedFields = [
        "newMessage",
        "viewingRequest",
        "viewingUpdate",
        "applicationUpdate",
        "listingApproved",
        "listingRejected",
        "savedSearchMatch",
        "priceChange",
        "securityAlerts",
        "emailEnabled",
        "pushEnabled",
        "smsEnabled",
      ];

      const updateData: Record<string, any> = {};
      for (const field of allowedFields) {
        if (field in preferences && typeof preferences[field] === "boolean") {
          updateData[field] = preferences[field];
        }
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.notificationPreference.upsert({
          where: { userId },
          create: { userId, ...updateData },
          update: updateData,
        });
      }
    }

    // Update landlord settings (response rate, etc.)
    if (landlord && typeof landlord === "object") {
      const role = auth.session.user.role;
      if (role === "LANDLORD" || role === "AGENT") {
        const landlordUpdate: Record<string, any> = {};
        if (typeof landlord.responseRate === "number") {
          landlordUpdate.responseRate = Math.min(
            100,
            Math.max(0, landlord.responseRate)
          );
        }
        if (typeof landlord.responseTimeHours === "number") {
          landlordUpdate.responseTimeHours = Math.max(
            0,
            landlord.responseTimeHours
          );
        }

        if (Object.keys(landlordUpdate).length > 0) {
          if (role === "LANDLORD") {
            await prisma.landlord.upsert({
              where: { userId },
              create: { userId, ...landlordUpdate },
              update: landlordUpdate,
            });
          } else {
            await prisma.agent.upsert({
              where: { userId },
              create: { userId, ...landlordUpdate },
              update: landlordUpdate,
            });
          }
        }
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "SETTINGS_UPDATED",
        entity: "User",
        entityId: userId,
        newData: {
          preferencesUpdated: !!preferences,
          landlordUpdated: !!landlord,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
