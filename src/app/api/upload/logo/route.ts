import { NextResponse, type NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clinics } from "@/db/schema";
import { requireActivePermission } from "@/lib/auth";
import { PermissionError } from "@/lib/permissions";
import { SubscriptionLapsedError } from "@/lib/auth";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

/**
 * Uploads a clinic logo to blob storage and records the URL on the clinic.
 *
 * The upload happens server-side rather than direct-to-blob because the file
 * is small and this way the write token never reaches the browser.
 */
export async function POST(request: NextRequest) {
  let clinicId: string;
  try {
    const session = await requireActivePermission("clinic:manage");
    clinicId = session.clinic.id;
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json(
        { error: "You do not have permission to change the logo." },
        { status: 403 },
      );
    }
    if (error instanceof SubscriptionLapsedError) {
      return NextResponse.json(
        { error: "Your subscription is not active." },
        { status: 402 },
      );
    }
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "File uploads are not switched on yet. Paste an image link instead.",
      },
      { status: 501 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was sent." }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "Use a PNG, JPG, WEBP or SVG image." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "That image is larger than 2MB." },
      { status: 400 },
    );
  }

  try {
    // Keyed by clinic so one tenant can never overwrite another's logo, and
    // randomised so a replaced logo is not served from a stale CDN cache.
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const blob = await put(`logos/${clinicId}.${extension}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });

    await db
      .update(clinics)
      .set({ logoUrl: blob.url, updatedAt: new Date() })
      .where(eq(clinics.id, clinicId));

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("[logo-upload]", error);
    return NextResponse.json(
      { error: "Could not upload that image. Please try again." },
      { status: 500 },
    );
  }
}
