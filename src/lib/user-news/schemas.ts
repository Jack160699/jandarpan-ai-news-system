import { z } from "zod";
import { USER_NEWS_CATEGORIES } from "@/lib/user-news/ai-draft";

const language = z.enum(["hi", "en"]);
const district = z.string().trim().max(60).regex(/^[a-z0-9-]+$/i, "district must be a slug").nullable().optional();

export const CreateSubmissionSchema = z.object({
  language,
  text: z.string().max(7000).optional().nullable(),
  locationText: z.string().trim().max(160).optional().nullable(),
  declaredDistrict: district,
});

export const UpdateSourceSchema = z.object({
  text: z.string().max(7000).optional().nullable(),
  locationText: z.string().trim().max(160).optional().nullable(),
  declaredDistrict: district,
});

export const EditSchema = z
  .object({
    headline: z.string().trim().min(8).max(160).optional(),
    subheadline: z.string().trim().max(240).nullable().optional(),
    summary: z.string().trim().min(20).max(500).optional(),
    body: z.string().trim().min(80).max(8000).optional(),
    locationText: z.string().trim().max(160).nullable().optional(),
    declaredDistrict: district,
    category: z.enum(USER_NEWS_CATEGORIES).nullable().optional(),
    tags: z.array(z.string().trim().min(2).max(40)).max(8).optional(),
  })
  .strict();

export const TranscriptSchema = z.object({ transcript: z.string().max(7000) });

export const MediaSlotSchema = z.object({
  kind: z.enum(["image", "video", "voice"]),
  mime: z.string().trim().min(3).max(100),
  sizeBytes: z.number().int().positive().max(150 * 1024 * 1024),
});

export const TranscribeSchema = z.object({ mediaId: z.string().uuid() });

export const ModerateSchema = z.object({
  decision: z.enum(["approve", "reject", "request_edit", "hold", "block", "unpublish", "confirm_district"]),
  reasonCode: z.string().trim().max(60).nullable().optional(),
  reasonText: z.string().trim().max(1000).nullable().optional(),
  acknowledgeFlags: z.boolean().optional(),
  confirmDistrict: district,
  edits: z
    .object({
      headline: z.string().trim().min(8).max(160).optional(),
      subheadline: z.string().trim().max(240).nullable().optional(),
      summary: z.string().trim().min(20).max(500).optional(),
      body: z.string().trim().min(80).max(8000).optional(),
    })
    .strict()
    .optional(),
});

export const AttestVerificationSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(["verified", "rejected", "pending", "revoked"]),
  /** An internal case / ticket id for the human check that was done outside the app. Never an identity number. */
  reference: z.string().trim().regex(/^[A-Za-z0-9._:\-]{6,128}$/, "reference must be a case id, not identity data"),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const UuidSchema = z.string().uuid();
