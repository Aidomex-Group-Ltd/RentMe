/**
 * Notification templates for Rent Mesh property events.
 *
 * Each function builds an EmailMessage for the sendEmail() utility.
 * Notifications are fire-and-forget: if SMTP is not configured,
 * they log to console; if SMTP fails, they log the error.
 * Property creation is never blocked by a failed notification.
 */

import { sendEmail, type EmailMessage } from "@/lib/email";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://rentme.ug";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.SMTP_FROM;

interface PropertyNotificationData {
  propertyId: string;
  propertyTitle: string;
  rent: number;
  /** District is optional/nullable in the Property model (district String?). */
  district?: string | null;
  city?: string;
  neighborhood?: string;
  landlordName: string;
  landlordEmail?: string;
  landlordPhone?: string;
  bedrooms: number;
  bathrooms: number;
  propertyType: string;
  submittedAt: string;
}

/**
 * Notify the landlord that their listing was submitted for review.
 * Fire-and-forget — never blocks the response.
 */
export async function notifyLandlordListingSubmitted(
  data: PropertyNotificationData
): Promise<void> {
  if (!data.landlordEmail) return;

  const message: EmailMessage = {
    to: data.landlordEmail,
    subject: `Listing submitted: ${data.propertyTitle}`,
    text: [
      `Hi ${data.landlordName},`,
      "",
      "Your property listing has been submitted for review.",
      "",
      `  Title:    ${data.propertyTitle}`,
      `  Location: ${[data.neighborhood, data.city, data.district].filter(Boolean).join(", ")}`,
      `  Rent:     UGX ${data.rent.toLocaleString()}/month`,
      `  Type:     ${data.bedrooms} bed / ${data.bathrooms} bath — ${data.propertyType}`,
      `  Submitted: ${data.submittedAt}`,
      "",
      `View your listings: ${SITE_URL}/dashboard/landlord`,
      "",
      "Our team will review your listing and publish it within 24 hours.",
      "",
      "Best regards,",
      "Rent Mesh Team",
    ].join("\n"),
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <div style="background: #1a4d42; border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
          <img src="${SITE_URL}/icons/rentmesh-192.png" alt="Rent Mesh" style="height: 40px; width: 40px; border-radius: 8px; object-fit: contain;" />
          <h1 style="color: white; margin: 8px 0 0; font-size: 20px;">Rent Mesh</h1>
        </div>
        <div style="background: #f9fafb; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="margin: 0 0 16px; color: #111827;">Listing Submitted ✓</h2>
          <p style="color: #4b5563;">Hi ${data.landlordName},</p>
          <p style="color: #4b5563;">Your property listing has been submitted for review.</p>

          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 4px 0; color: #6b7280;"><strong>Title:</strong> ${data.propertyTitle}</p>
            <p style="margin: 4px 0; color: #6b7280;"><strong>Location:</strong> ${[data.neighborhood, data.city, data.district].filter(Boolean).join(", ")}</p>
            <p style="margin: 4px 0; color: #6b7280;"><strong>Rent:</strong> UGX ${data.rent.toLocaleString()}/month</p>
            <p style="margin: 4px 0; color: #6b7280;"><strong>Type:</strong> ${data.bedrooms} bed / ${data.bathrooms} bath — ${data.propertyType}</p>
            <p style="margin: 4px 0; color: #6b7280;"><strong>Submitted:</strong> ${data.submittedAt}</p>
          </div>

          <a href="${SITE_URL}/dashboard/landlord" style="display: inline-block; background: #1a4d42; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 8px 0;">
            View Your Listings
          </a>

          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            Our team will review your listing and publish it within 24 hours.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} Rent Mesh Uganda · <a href="${SITE_URL}" style="color: #1a4d42;">rentme.ug</a>
          </p>
        </div>
      </div>
    `,
  };

  await sendEmail(message);
}

/**
 * Notify admin when a new listing is submitted for review.
 * Fire-and-forget — never blocks the response.
 */
export async function notifyAdminNewListing(
  data: PropertyNotificationData
): Promise<void> {
  if (!ADMIN_EMAIL) return;

  const message: EmailMessage = {
    to: ADMIN_EMAIL,
    subject: `[Review] New listing: ${data.propertyTitle}`,
    text: [
      "A new property listing is awaiting review.",
      "",
      `  Title:    ${data.propertyTitle}`,
      `  Landlord: ${data.landlordName} (${data.landlordEmail || data.landlordPhone || "no contact"})`,
      `  Location: ${[data.neighborhood, data.city, data.district].filter(Boolean).join(", ")}`,
      `  Rent:     UGX ${data.rent.toLocaleString()}/month`,
      `  Type:     ${data.bedrooms} bed / ${data.bathrooms} bath — ${data.propertyType}`,
      "",
      `Review at: ${SITE_URL}/admin`,
    ].join("\n"),
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <div style="background: #1a4d42; border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
          <img src="${SITE_URL}/icons/rentmesh-192.png" alt="Rent Mesh" style="height: 40px; width: 40px; border-radius: 8px; object-fit: contain;" />
          <h1 style="color: white; margin: 8px 0 0; font-size: 20px;">Rent Mesh Admin</h1>
        </div>
        <div style="background: #f9fafb; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="margin: 0 0 16px; color: #111827;">📋 New Listing to Review</h2>

          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 4px 0; color: #6b7280;"><strong>Title:</strong> ${data.propertyTitle}</p>
            <p style="margin: 4px 0; color: #6b7280;"><strong>Landlord:</strong> ${data.landlordName}</p>
            <p style="margin: 4px 0; color: #6b7280;"><strong>Contact:</strong> ${data.landlordEmail || data.landlordPhone || "—"}</p>
            <p style="margin: 4px 0; color: #6b7280;"><strong>Location:</strong> ${[data.neighborhood, data.city, data.district].filter(Boolean).join(", ")}</p>
            <p style="margin: 4px 0; color: #6b7280;"><strong>Rent:</strong> UGX ${data.rent.toLocaleString()}/month</p>
          </div>

          <a href="${SITE_URL}/admin" style="display: inline-block; background: #1a4d42; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Review Listing
          </a>
        </div>
      </div>
    `,
  };

  await sendEmail(message);
}
