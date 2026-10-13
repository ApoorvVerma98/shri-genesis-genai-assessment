import { describe, expect, it } from "vitest";
import { escapeXml } from "./escape.js";

describe("escapeXml", () => {
  it("escapes unsafe characters", () => {
    expect(escapeXml(`Tom & "Jerry" <script>`)).toBe(
      "Tom &amp; &quot;Jerry&quot; &lt;script&gt;",
    );
  });
});
