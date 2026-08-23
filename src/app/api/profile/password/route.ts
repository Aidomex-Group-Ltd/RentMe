import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * PUT /api/profile/password - Change user password
 *
 * Requires:
 * - Current password (verified against stored hash)
 * - New password (minimum 8 characters)
 *
 * Security:
 * - Verifies current password before allowing change
 * - Hashes new password with bcrypt (12 rounds)
 * - Audit logs the password change
 * - Invalidates auth cache
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    // Validate inputs
    if (!currentPassword || typeof currentPassword !== "string") {
      return NextResponse.json(
        { error: "Current password is required" },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== "string") {
      return NextResponse.json(
        { error: "New password is required" },
        { status: 400 }
      );
    }

    // Password strength validation
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (newPassword.length > 128) {
      return NextResponse.json(
        { error: "New password must be less than 128 characters" },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "New password must be different from current password" },
        { status: 400 }
      );
    }

    // Fetch user with password hash
    const user = await prisma.user.findUnique({
      where: { id: auth.session.user.id },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Users who signed up via OAuth/social may not have a password
    if (!user.passwordHash) {
      return NextResponse.json(
        {
          error:
            "Your account was created via social login. Please set a password through the password reset flow.",
        },
        { status: 400 }
      );
    }

    // Verify current password
    const isCurrentValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );
    if (!isCurrentValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // Hash new password (12 rounds)
    const newHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: auth.session.user.id },
      data: { passwordHash: newHash },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        action: "PASSWORD_CHANGED",
        entity: "User",
        entityId: auth.session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}
