import { describe, it, expect } from "vitest";
import { renderMarkdown, parseFrontmatter } from "$lib/server/markdown";

describe("parseFrontmatter", () => {
  it("extracts frontmatter and body", () => {
    const input = `---
view: kanban
access: public
title: "My Board"
---

# Content here`;

    const result = parseFrontmatter(input);
    expect(result.data.view).toBe("kanban");
    expect(result.data.access).toBe("public");
    expect(result.data.title).toBe("My Board");
    expect(result.content).toContain("# Content here");
  });

  it("handles missing frontmatter", () => {
    const result = parseFrontmatter("# Just markdown");
    expect(result.data).toEqual({});
    expect(result.content).toContain("# Just markdown");
  });
});

describe("renderMarkdown", () => {
  it("renders headings", async () => {
    const html = await renderMarkdown("# Hello World");
    expect(html).toContain("<h1");
    expect(html).toContain("Hello World");
  });

  it("renders code blocks with syntax highlighting", async () => {
    const html = await renderMarkdown("```javascript\nconst x = 1;\n```");
    expect(html).toContain("const");
    expect(html).toContain("<pre");
  });

  it("renders checkboxes", async () => {
    const html = await renderMarkdown("- [ ] Todo\n- [x] Done");
    expect(html).toContain('type="checkbox"');
  });
});
