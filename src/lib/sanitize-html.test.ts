import { sanitizeBlogHtml } from "@/lib/sanitize-html";

describe("sanitizeBlogHtml", () => {
  it("removes script elements and their contents", () => {
    const output = sanitizeBlogHtml('<p>Hello</p><script>alert("xss")</script><p>World</p>');

    expect(output).toBe("<p>Hello</p><p>World</p>");
  });

  it("removes an unclosed dangerous tag", () => {
    expect(sanitizeBlogHtml('<p>Hello</p><script src="x.js">')).not.toContain("<script");
  });

  it("removes inline event handlers", () => {
    const output = sanitizeBlogHtml('<img src="/a.jpg" onerror="alert(1)" alt="a">');

    expect(output).not.toContain("onerror");
    expect(output).toContain('src="/a.jpg"');
  });

  it("removes javascript and data URLs", () => {
    const output = sanitizeBlogHtml(
      '<a href="javascript:alert(1)">x</a><img src="data:text/html;base64,PHNjcmlwdD4=">'
    );

    expect(output).not.toContain("javascript:");
    expect(output).not.toContain("data:text/html");
  });

  it("keeps ordinary formatting", () => {
    const html = '<h3>Title</h3><p>Some <strong>bold</strong> text.</p><ul><li>One</li></ul>';

    expect(sanitizeBlogHtml(html)).toBe(html);
  });

  it("returns an empty string for empty input", () => {
    expect(sanitizeBlogHtml("")).toBe("");
  });
});
