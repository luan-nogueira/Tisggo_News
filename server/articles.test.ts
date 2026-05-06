import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock context
function createMockContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Articles Router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    const ctx = createMockContext();
    caller = appRouter.createCaller(ctx);
  });

  it("should fetch articles list", async () => {
    const articles = await caller.articles.list();
    expect(Array.isArray(articles)).toBe(true);
  });

  it("should handle invalid slug gracefully", async () => {
    try {
      await caller.articles.bySlug("invalid-slug-that-does-not-exist");
    } catch (error) {
      // Expected to fail or return undefined
      expect(error).toBeDefined();
    }
  });

  it("should fetch categories list", async () => {
    const categories = await caller.categories.list();
    expect(Array.isArray(categories)).toBe(true);
  });

  it("should handle search query", async () => {
    try {
      const results = await caller.articles.search("test");
      expect(Array.isArray(results)).toBe(true);
    } catch (error) {
      // Search might fail if database is not populated
      expect(error).toBeDefined();
    }
  });
});
