import { describe, expect, it } from "vitest";
import {
  InvalidTransitionError,
  SUBMISSION_STATUSES,
  allowedTransitions,
  assertTransition,
  canTransition,
  isAuthorEditable,
  statusMatchesFilter,
  type Actor,
  type SubmissionStatus,
} from "@/lib/user-news/status-machine";

const ACTORS: Actor[] = ["author", "moderator", "system"];

describe("user-news state machine: the happy path", () => {
  it("walks draft -> ai_generated -> user_approved -> submitted -> under_review -> approved -> published", () => {
    expect(canTransition("draft", "ai_generated", "system")).toBe(true);
    expect(canTransition("ai_generated", "user_approved", "author")).toBe(true);
    expect(canTransition("user_approved", "submitted", "author")).toBe(true);
    expect(canTransition("submitted", "under_review", "system")).toBe(true);
    expect(canTransition("under_review", "approved", "moderator")).toBe(true);
    expect(canTransition("approved", "published", "moderator")).toBe(true);
  });

  it("request-edit returns the story to the author; the author must approve again before it can be submitted", () => {
    expect(canTransition("under_review", "ai_generated", "moderator")).toBe(true);
    expect(canTransition("ai_generated", "submitted", "author")).toBe(false);
    expect(canTransition("ai_generated", "user_approved", "author")).toBe(true);
  });

  it("a moderator can hold a story (stays under review)", () => {
    expect(canTransition("under_review", "under_review", "moderator")).toBe(true);
  });
});

describe("user-news state machine: no bypasses", () => {
  it("an author can NEVER approve, publish, reject or block (no self-approval, no self-publishing)", () => {
    for (const from of SUBMISSION_STATUSES) {
      for (const to of ["approved", "published", "rejected", "blocked", "under_review"] as SubmissionStatus[]) {
        expect(canTransition(from, to, "author")).toBe(false);
      }
    }
  });

  it("only a moderator or the system can publish, and only from approved", () => {
    for (const from of SUBMISSION_STATUSES) {
      for (const actor of ACTORS) {
        const allowed = canTransition(from, "published", actor);
        if (from === "approved" && actor !== "author") expect(allowed).toBe(true);
        else expect(allowed).toBe(false);
      }
    }
  });

  it("nothing reaches 'user_approved' except through the author", () => {
    for (const from of SUBMISSION_STATUSES) {
      expect(canTransition(from, "user_approved", "moderator")).toBe(false);
      expect(canTransition(from, "user_approved", "system")).toBe(false);
    }
  });

  it("the platform never submits on a user's behalf from an unapproved draft", () => {
    for (const from of ["draft", "ai_generated"] as SubmissionStatus[]) {
      for (const actor of ACTORS) expect(canTransition(from, "submitted", actor)).toBe(false);
    }
  });

  it("rejected, blocked and withdrawn are terminal for everyone", () => {
    for (const from of ["rejected", "blocked", "withdrawn"] as SubmissionStatus[]) {
      for (const actor of ACTORS) expect(allowedTransitions(from, actor)).toEqual([]);
    }
  });

  it("the author may withdraw before moderation finishes and may withdraw a published story; a moderator may take it down", () => {
    for (const from of ["draft", "ai_generated", "user_approved", "submitted", "under_review", "approved", "published"] as SubmissionStatus[]) {
      expect(canTransition(from, "withdrawn", "author")).toBe(true);
    }
    expect(canTransition("published", "blocked", "moderator")).toBe(true);
  });

  it("assertTransition throws a typed error", () => {
    expect(() => assertTransition("draft", "published", "author")).toThrow(InvalidTransitionError);
    try {
      assertTransition("draft", "published", "author");
    } catch (e) {
      expect((e as InvalidTransitionError).code).toBe("invalid_transition");
    }
  });
});

describe("editability and filters", () => {
  it("the author edits only before the story is handed to moderation", () => {
    expect(SUBMISSION_STATUSES.filter(isAuthorEditable)).toEqual(["draft", "ai_generated", "user_approved"]);
  });

  it("My News filters cover every status exactly once across pending / published / rejected / draft", () => {
    for (const s of SUBMISSION_STATUSES) {
      const groups = (["published", "pending", "rejected", "draft"] as const).filter((f) => statusMatchesFilter(s, f));
      if (s === "withdrawn") expect(groups).toEqual([]); // only visible under "all"
      else expect(groups).toHaveLength(1);
      expect(statusMatchesFilter(s, "all")).toBe(true);
    }
  });
});
