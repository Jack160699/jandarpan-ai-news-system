import { z } from "zod";
import { CANONICAL_ROLES, type CanonicalRole } from "@/lib/saas-auth/roles";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("invalid_email")
  .max(320);

const fullNameSchema = z
  .string()
  .trim()
  .min(1, "full_name_required")
  .max(120);

const roleSchema = z.custom<CanonicalRole>(
  (v) => typeof v === "string" && CANONICAL_ROLES.includes(v as CanonicalRole),
  { message: "invalid_role" }
);

export const invitePayloadSchema = z.object({
  mode: z.literal("invite"),
  email: emailSchema,
  fullName: fullNameSchema,
  role: roleSchema,
});

export const createStaffPayloadSchema = z.object({
  mode: z.literal("create"),
  email: emailSchema,
  fullName: fullNameSchema,
  password: z.string().min(8, "password_min_8_chars").max(128),
  role: roleSchema,
});

export const teamPostBodySchema = z.discriminatedUnion("mode", [
  invitePayloadSchema,
  createStaffPayloadSchema,
]);

export const teamPatchBodySchema = z
  .object({
    membershipId: z.string().uuid("membershipId_required"),
    role: roleSchema.optional(),
    status: z.enum(["active", "invited", "suspended"]).optional(),
    password: z.string().min(8).max(128).optional(),
  })
  .refine(
    (v) => v.role !== undefined || v.status !== undefined || v.password !== undefined,
    { message: "role_status_or_password_required" }
  );

export const teamDeleteBodySchema = z.object({
  membershipId: z.string().uuid("membershipId_required"),
});
