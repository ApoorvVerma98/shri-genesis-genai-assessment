import { describe, expect, it } from "vitest";
import { resolveListenPort } from "./listen-port.js";

describe("resolveListenPort", () => {
  it("prefers PORT over API_PORT and default", () => {
    expect(resolveListenPort({ PORT: "8080", API_PORT: "3001" })).toBe(8080);
  });

  it("uses API_PORT when PORT is unset", () => {
    expect(resolveListenPort({ API_PORT: "4000" })).toBe(4000);
  });

  it("defaults to 3001 when neither is set", () => {
    expect(resolveListenPort({})).toBe(3001);
  });
});
