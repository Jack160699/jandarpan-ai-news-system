"use client";

import Link from "next/link";
import { useJdDsT } from "../i18n";
import {
  buildPublicationFooterColumns,
  type FooterLink,
} from "../homepage/footer-links";
import { BrandMark } from "./BrandMark";

type DeskFooterProps = {
  /** Configured social profiles only — never invent handles. */
  socialLinks?: FooterLink[];
  /** Optional ownership / publisher line already configured upstream. */
  publisherLine?: string | null;
};

/**
 * Publication-grade site footer — navy Reader DS identity.
 * Only known-valid routes render (dead links filtered).
 */
export function DeskFooter(_props: DeskFooterProps = {}) {
  // ZERO FOOTER RULE: Completely removed from page composition across the entire app.
  return null;
}
