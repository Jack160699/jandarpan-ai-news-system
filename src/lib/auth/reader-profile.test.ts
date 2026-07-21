import { describe, expect, it } from "vitest";
import {
  applyCustomDisplayName,
  extractProviderIdentity,
  mergeProviderIntoProfile,
  validateAvatarUpload,
  type ReaderEditableProfile,
} from "./reader-profile";

const base: ReaderEditableProfile = {
  displayName: "Reader",
  avatarUrl: null,
  displayNameCustomized: false,
  avatarCustomized: false,
  homeDistrict: null,
  language: null,
  districtExplicit: false,
};

describe("reader profile sync", () => {
  it("imports Google name and photo on first login", () => {
    const provider = extractProviderIdentity({
      email: "reader@gmail.com",
      user_metadata: {
        full_name: "राम शर्मा",
        avatar_url: "https://lh3.googleusercontent.com/a/photo",
      },
    });
    const merged = mergeProviderIntoProfile(null, provider);
    expect(merged.displayName).toBe("राम शर्मा");
    expect(merged.avatarUrl).toBe("https://lh3.googleusercontent.com/a/photo");
    expect(merged.displayNameCustomized).toBe(false);
  });

  it("does not overwrite a custom display name on later login", () => {
    const customized = applyCustomDisplayName(base, "जनदर्पण पाठक");
    const provider = extractProviderIdentity({
      email: "reader@gmail.com",
      user_metadata: { full_name: "Google Name", picture: "https://example.com/g.png" },
    });
    const merged = mergeProviderIntoProfile(customized, provider);
    expect(merged.displayName).toBe("जनदर्पण पाठक");
    expect(merged.displayNameCustomized).toBe(true);
    expect(merged.avatarUrl).toBe("https://example.com/g.png");
  });

  it("does not overwrite a customized avatar", () => {
    const customized: ReaderEditableProfile = {
      ...base,
      avatarUrl: "https://cdn.example/custom.png",
      avatarCustomized: true,
    };
    const merged = mergeProviderIntoProfile(customized, {
      displayName: "G",
      avatarUrl: "https://google/photo.png",
      email: "a@b.c",
    });
    expect(merged.avatarUrl).toBe("https://cdn.example/custom.png");
  });

  it("validates avatar type and size", () => {
    expect(validateAvatarUpload({ type: "image/png", size: 1000 }).ok).toBe(true);
    expect(validateAvatarUpload({ type: "image/gif", size: 1000 }).ok).toBe(false);
    expect(
      validateAvatarUpload({ type: "image/jpeg", size: 3 * 1024 * 1024 }).ok
    ).toBe(false);
  });
});
