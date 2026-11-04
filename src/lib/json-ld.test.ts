import { serializeJsonLd } from "@/lib/json-ld";

describe("serializeJsonLd", () => {
  it("escapes characters that could close the script element", () => {
    const serialized = serializeJsonLd({ name: "</script><script>alert(1)</script>" });

    expect(serialized).not.toContain("</script>");
    expect(serialized).toContain("\\u003c/script\\u003e");
  });

  it("stays valid JSON after escaping", () => {
    const value = { headline: "A & B <c>", nested: { text: "</script>" } };
    expect(JSON.parse(serializeJsonLd(value))).toEqual(value);
  });

  it("leaves ordinary values untouched", () => {
    expect(serializeJsonLd({ a: 1, b: true, c: null })).toBe('{"a":1,"b":true,"c":null}');
  });
});
