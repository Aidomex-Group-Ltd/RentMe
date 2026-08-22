import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/inspections/[id] - Get inspection session details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const inspection = await prisma.inspectionSession.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            district: true,
            latitude: true,
            longitude: true,
          },
        },
        waypoints: {
          orderBy: { recordedAt: "asc" },
        },
      },
    });

    if (!inspection) {
      return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
    }

    return NextResponse.json({ session: inspection });
  } catch (error) {
    console.error("Inspection fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inspection" },
      { status: 500 }
    );
  }
}

// PATCH /api/inspections/[id] - Update inspection (add waypoint or complete)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const inspection = await prisma.inspectionSession.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        property: {
          select: {
            latitude: true,
            longitude: true,
          },
        },
        waypoints: {
          orderBy: { recordedAt: "asc" },
          take: 1,
          select: { latitude: true, longitude: true, recordedAt: true },
        },
      },
    });

    if (!inspection) {
      return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
    }

    if (inspection.status !== "ACTIVE") {
      return NextResponse.json({ error: "Inspection is not active" }, { status: 400 });
    }

    const body = await req.json();

    // Handle waypoint recording
    if (body.latitude !== undefined && body.longitude !== undefined) {
      const latitude = Number(body.latitude);
      const longitude = Number(body.longitude);
      const accuracyM = body.accuracyM != null ? Number(body.accuracyM) : null;
      const speedMps = body.speedMps != null ? Number(body.speedMps) : null;

      // Validate coordinates are within valid ranges
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
        return NextResponse.json({ error: "Invalid latitude (must be -90 to 90)" }, { status: 400 });
      }
      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        return NextResponse.json({ error: "Invalid longitude (must be -180 to 180)" }, { status: 400 });
      }
      if (accuracyM != null && (!Number.isFinite(accuracyM) || accuracyM < 0 || accuracyM > 10000)) {
        return NextResponse.json({ error: "Invalid accuracyM" }, { status: 400 });
      }
      if (speedMps != null && (!Number.isFinite(speedMps) || speedMps < 0 || speedMps > 300)) {
        return NextResponse.json({ error: "Invalid speedMps" }, { status: 400 });
      }

      // Rate limit: max 1 waypoint per second per session
      const lastWaypoint = inspection.waypoints[0];
      if (lastWaypoint) {
        const secondsSinceLast = (Date.now() - new Date(lastWaypoint.recordedAt || 0).getTime()) / 1000;
        if (secondsSinceLast < 1) {
          return NextResponse.json({ error: "Waypoints must be at least 1 second apart" }, { status: 429 });
        }
      }

      // Calculate distance from previous waypoint
      let distanceFromPrevM = 0;
      if (inspection.waypoints.length > 0 && inspection.property) {
        const prev = inspection.waypoints[0];
        distanceFromPrevM = calculateDistance(
          prev.latitude,
          prev.longitude,
          latitude,
          longitude
        );
      }

      const waypoint = await prisma.inspectionWaypoint.create({
        data: {
          sessionId: params.id,
          latitude,
          longitude,
          accuracyM,
          speedMps,
          distanceFromPrevM,
        },
      });

      // Check arrival at property
      let arrived = false;
      if (inspection.property?.latitude && inspection.property?.longitude) {
        const distToProperty = calculateDistance(
          latitude,
          longitude,
          inspection.property.latitude,
          inspection.property.longitude
        );

        if (distToProperty <= inspection.arrivalRadiusM && !inspection.arrivedAt) {
          await prisma.inspectionSession.update({
            where: { id: params.id },
            data: { arrivedAt: new Date() },
          });
          arrived = true;
        }
      }

      // Update total distance
      const totalDistance = await prisma.inspectionWaypoint.aggregate({
        where: { sessionId: params.id },
        _sum: { distanceFromPrevM: true },
      });

      await prisma.inspectionSession.update({
        where: { id: params.id },
        data: {
          totalDistanceM: totalDistance._sum.distanceFromPrevM || 0,
        },
      });

      return NextResponse.json({ waypoint, arrived }, { status: 201 });
    }

    // Handle completion
    if (body.action === "complete") {
      const now = new Date();
      const durationS = Math.floor(
        (now.getTime() - inspection.startedAt.getTime()) / 1000
      );

      // Calculate stats from waypoints
      const waypoints = await prisma.inspectionWaypoint.findMany({
        where: { sessionId: params.id },
        orderBy: { recordedAt: "asc" },
      });

      let maxSpeed = 0;
      let totalSpeed = 0;
      let speedCount = 0;

      for (const wp of waypoints) {
        if (wp.speedMps) {
          const speedKmh = wp.speedMps * 3.6;
          maxSpeed = Math.max(maxSpeed, speedKmh);
          totalSpeed += speedKmh;
          speedCount++;
        }
      }

      const avgSpeed = speedCount > 0 ? totalSpeed / speedCount : 0;

      const updated = await prisma.inspectionSession.update({
        where: { id: params.id },
        data: {
          status: "COMPLETED",
          endedAt: now,
          durationS,
          maxSpeedKmh: maxSpeed,
          avgSpeedKmh: avgSpeed,
        },
      });

      return NextResponse.json({ session: updated });
    }

    // Handle cancellation
    if (body.action === "cancel") {
      const updated = await prisma.inspectionSession.update({
        where: { id: params.id },
        data: {
          status: "CANCELLED",
          endedAt: new Date(),
        },
      });

      return NextResponse.json({ session: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Inspection update error:", error);
    return NextResponse.json(
      { error: "Failed to update inspection" },
      { status: 500 }
    );
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula.
 * Returns distance in meters.
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
