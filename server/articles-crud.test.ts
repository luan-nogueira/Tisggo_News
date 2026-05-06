import { describe, expect, it } from "vitest";
import { createArticleSchema, updateArticleSchema } from "./articles-crud";

describe("Articles CRUD Validation", () => {
  it("should validate article creation schema with valid data", () => {
    const validData = {
      title: "Test Article",
      excerpt: "This is a test article excerpt",
      content: "This is the full content of the test article with enough text",
      categoryId: 1,
      author: "Test Author",
      published: false,
    };

    const result = createArticleSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject article creation with short title", () => {
    const invalidData = {
      title: "A",
      excerpt: "This is a test article excerpt",
      content: "This is the full content of the test article with enough text",
      categoryId: 1,
      author: "Test Author",
      published: false,
    };

    const result = createArticleSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should reject article creation with short excerpt", () => {
    const invalidData = {
      title: "Test Article",
      excerpt: "Short",
      content: "This is the full content of the test article with enough text",
      categoryId: 1,
      author: "Test Author",
      published: false,
    };

    const result = createArticleSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should reject article creation with short content", () => {
    const invalidData = {
      title: "Test Article",
      excerpt: "This is a test article excerpt",
      content: "Short",
      categoryId: 1,
      author: "Test Author",
      published: false,
    };

    const result = createArticleSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should validate article update schema with valid data", () => {
    const validData = {
      id: 1,
      title: "Updated Article",
      excerpt: "Updated excerpt for test article",
      content: "Updated content with more text for the test article",
      categoryId: 1,
      author: "Updated Author",
      published: true,
    };

    const result = updateArticleSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should allow optional coverImage field", () => {
    const validData = {
      title: "Test Article",
      excerpt: "This is a test article excerpt",
      content: "This is the full content of the test article with enough text",
      categoryId: 1,
      author: "Test Author",
      coverImage: "https://example.com/image.jpg",
      published: false,
    };

    const result = createArticleSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});
