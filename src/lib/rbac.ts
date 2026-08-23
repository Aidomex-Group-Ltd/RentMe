/**
 * Role-Based Access Control (RBAC) and object-level authorization helpers.
 *
 * Every API route MUST call at least one of:
 *   - requireAuth()          → ensures a session exists
 *   - requireRole()          → ensures the session user has a specific role
 *   - requirePropertyAccess() → ensures the user owns/manages a given property
 *   - requireTenancyAccess()  → ensures the user is the tenant or landlord of a tenancy
 *
 * Object-level checks are preferred over role-level checks.  A TENANT role
 * alone is never sufficient to access another tenant's data — the user must
 * be the actual tenant of the specific tenancy record.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// ─── Types ──────────────────────────────────────────────

export type AppRole = "TENANT" | "LANDLORD" | "AGENT" | "ADMIN";

export interface AuthSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
    phone?: string | null;
    status?: string | null;
  };
}

export interface AuthResult {
  session: AuthSession;
  error?: never;
}

export interface AuthError {
  session?: never;
  error: NextResponse;
}

export type AuthResponse = AuthResult | AuthError;

// ─── Authentication ─────────────────────────────────────

/**
 * Require an authenticated session. Returns 401 if unauthenticated.
 */
export async function requireAuth(): Promise<AuthResponse> {
  const session = (await getServerSession(authOptions)) as AuthSession | null;
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}

/**
 * Require a specific role. Returns 401 if unauthenticated, 403 if wrong role.
 */
export async function requireRole(
  ...roles: AppRole[]
): Promise<AuthResponse> {
  const auth = await requireAuth();
  if (auth.error) return auth;

  if (!roles.includes(auth.session.user.role as AppRole)) {
    return {
      error: NextResponse.json(
        { error: "Forbidden — insufficient role" },
        { status: 403 }
      ),
    };
  }
  return auth;
}

// ─── Object-Level Authorization ─────────────────────────

/**
 * Ensure the authenticated user has access to a specific property.
 *
 * Access rules:
 * - The user is the property owner (userId matches)
 * - The user is an AGENT assigned to the property
 * - The user is ADMIN
 * - The user has an active tenancy on the property
 */
export async function requirePropertyAccess(
  session: AuthSession,
  propertyId: string
): Promise<{ allowed: boolean; property?: any; error?: NextResponse }> {
  const role = session.user.role as AppRole;

  // Admins can access everything
  if (role === "ADMIN") {
    return { allowed: true };
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, userId: true, agentId: true },
  });

  if (!property) {
    return {
      allowed: false,
      error: NextResponse.json({ error: "Property not found" }, { status: 404 }),
    };
  }

  // Owner or assigned agent
  if (property.userId === session.user.id) {
    return { allowed: true, property };
  }
  if (property.agentId && property.agentId === session.user.id) {
    return { allowed: true, property };
  }

  // Tenant with active tenancy on this property
  const tenancy = await prisma.tenancy.findFirst({
    where: {
      propertyId,
      tenantId: session.user.id,
      status: { in: ["PENDING", "ACTIVE", "NOTICE_GIVEN", "MOVE_OUT_SCHEDULED"] },
    },
    select: { id: true },
  });

  if (tenancy) {
    return { allowed: true, property };
  }

  return {
    allowed: false,
    error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}

/**
 * Ensure the authenticated user has access to a specific tenancy.
 *
 * Access rules:
 * - The user is the tenant of the tenancy
 * - The user is the property owner of the tenancy's property
 * - The user is an agent managing the property
 * - The user is ADMIN
 */
export async function requireTenancyAccess(
  session: AuthSession,
  tenancyId: string
): Promise<{ allowed: boolean; tenancy?: any; error?: NextResponse }> {
  const role = session.user.role as AppRole;

  if (role === "ADMIN") {
    const tenancy = await prisma.tenancy.findUnique({
      where: { id: tenancyId },
      include: { property: { select: { userId: true, agentId: true } } },
    });
    if (!tenancy) {
      return {
        allowed: false,
        error: NextResponse.json({ error: "Tenancy not found" }, { status: 404 }),
      };
    }
    return { allowed: true, tenancy };
  }

  const tenancy = await prisma.tenancy.findUnique({
    where: { id: tenancyId },
    include: { property: { select: { userId: true, agentId: true } } },
  });

  if (!tenancy) {
    return {
      allowed: false,
      error: NextResponse.json({ error: "Tenancy not found" }, { status: 404 }),
    };
  }

  // The tenant themselves
  if (tenancy.tenantId === session.user.id) {
    return { allowed: true, tenancy };
  }

  // The property owner
  if (tenancy.property.userId === session.user.id) {
    return { allowed: true, tenancy };
  }

  // The assigned agent
  if (tenancy.property.agentId && tenancy.property.agentId === session.user.id) {
    return { allowed: true, tenancy };
  }

  return {
    allowed: false,
    error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}

/**
 * Ensure the authenticated user has access to a specific lease.
 */
export async function requireLeaseAccess(
  session: AuthSession,
  leaseId: string
): Promise<{ allowed: boolean; lease?: any; error?: NextResponse }> {
  const role = session.user.role as AppRole;

  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
    include: {
      tenancy: { include: { property: { select: { userId: true, agentId: true } } } },
    },
  });

  if (!lease) {
    return {
      allowed: false,
      error: NextResponse.json({ error: "Lease not found" }, { status: 404 }),
    };
  }

  if (role === "ADMIN") {
    return { allowed: true, lease };
  }

  if (lease.tenancy.tenantId === session.user.id) {
    return { allowed: true, lease };
  }
  if (lease.tenancy.property.userId === session.user.id) {
    return { allowed: true, lease };
  }
  if (lease.tenancy.property.agentId && lease.tenancy.property.agentId === session.user.id) {
    return { allowed: true, lease };
  }

  return {
    allowed: false,
    error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}

/**
 * Ensure the authenticated user can manage a maintenance request.
 *
 * - Tenant: only their own requests
 * - Landlord: requests on their properties
 * - Agent: requests on properties they manage
 * - Admin: all
 */
export async function requireMaintenanceAccess(
  session: AuthSession,
  requestId: string
): Promise<{ allowed: boolean; request?: any; error?: NextResponse }> {
  const role = session.user.role as AppRole;

  const mr = await prisma.maintenanceRequest.findUnique({
    where: { id: requestId },
    include: { property: { select: { userId: true, agentId: true } } },
  });

  if (!mr) {
    return {
      allowed: false,
      error: NextResponse.json({ error: "Maintenance request not found" }, { status: 404 }),
    };
  }

  if (role === "ADMIN") {
    return { allowed: true, request: mr };
  }
  if (mr.tenantId === session.user.id) {
    return { allowed: true, request: mr };
  }
  if (mr.property.userId === session.user.id) {
    return { allowed: true, request: mr };
  }
  if (mr.property.agentId && mr.property.agentId === session.user.id) {
    return { allowed: true, request: mr };
  }
  if (mr.assignedToId && mr.assignedToId === session.user.id) {
    return { allowed: true, request: mr };
  }

  return {
    allowed: false,
    error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}

// ─── Helpers ────────────────────────────────────────────

/**
 * Check if a user is a landlord or agent (i.e., property management role).
 */
export function isPropertyManager(role: string): boolean {
  return role === "LANDLORD" || role === "AGENT" || role === "ADMIN";
}

/**
 * Check if a user is a tenant.
 */
export function isTenant(role: string): boolean {
  return role === "TENANT";
}
