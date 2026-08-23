import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/rbac";
import prisma from "@/lib/prisma";

/**
 * PUT /api/profile - Update user profile
 * 
 * Allows authenticated users to update their profile information.
 * Supports: name, bio, gender, dateOfBirth, occupation, moveInTimeframe
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await req.json();
    const { name, bio, gender, dateOfBirth, occupation, moveInTimeframe } = body;

    // Validate inputs
    const updateData: Record<string, any> = {};
    
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      updateData.name = name.trim().slice(0, 100);
    }

    // Update user record
    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: auth.session.user.id },
        data: updateData,
      });
    }

    // Update or create profile record
    const profileData: Record<string, any> = {};
    
    if (bio !== undefined) profileData.bio = bio?.trim().slice(0, 2000) || null;
    if (gender !== undefined) profileData.gender = gender || null;
    if (dateOfBirth !== undefined) {
      if (dateOfBirth) {
        const d = new Date(dateOfBirth);
        if (isNaN(d.getTime())) {
          return NextResponse.json({ error: "Invalid date of birth" }, { status: 400 });
        }
        profileData.dateOfBirth = d;
      } else {
        profileData.dateOfBirth = null;
      }
    }
    if (occupation !== undefined) profileData.occupation = occupation?.trim().slice(0, 100) || null;
    if (moveInTimeframe !== undefined) profileData.moveInTimeframe = moveInTimeframe || null;

    if (Object.keys(profileData).length > 0) {
      await prisma.profile.upsert({
        where: { userId: auth.session.user.id },
        create: {
          userId: auth.session.user.id,
          ...profileData,
        },
        update: profileData,
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        action: "PROFILE_UPDATED",
        entity: "User",
        entityId: auth.session.user.id,
        newData: { name: updateData.name, ...profileData },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/profile - Get current user profile
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const user = await prisma.user.findUnique({
      where: { id: auth.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
        createdAt: true,
        profile: {
          select: {
            gender: true,
            dateOfBirth: true,
            bio: true,
            occupation: true,
            moveInTimeframe: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
