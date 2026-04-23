import { describe, it, expect } from "vitest";
import { generateSlug, isValidSlug } from "$lib/server/slug";

describe("generateSlug", () => {
  it("returns a string of 7 alphanumeric characters", () => {
    const slug = generateSlug();
    expect(slug).toMatch(/^[a-z0-9]{7}$/);
  });

  it("generates unique slugs", () => {
    const slugs = new Set(Array.from({ length: 100 }, () => generateSlug()));
    expect(slugs.size).toBe(100);
  });
});

describe("isValidSlug", () => {
  it("accepts valid slugs", () => {
    expect(isValidSlug("my-report")).toBe(true);
    expect(isValidSlug("abc123")).toBe(true);
    expect(isValidSlug("hello-world-2024")).toBe(true);
  });

  it("rejects invalid slugs", () => {
    expect(isValidSlug("")).toBe(false);
    expect(isValidSlug("has spaces")).toBe(false);
    expect(isValidSlug("UPPERCASE")).toBe(false);
    expect(isValidSlug("../traversal")).toBe(false);
    expect(isValidSlug("a".repeat(101))).toBe(false);
  });
});
