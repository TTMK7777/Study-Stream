import { describe, it, expect } from "vitest";

import { isSafeNext } from "@/app/auth/callback/route";

describe("auth/callback: isSafeNext (open redirect 緩和)", () => {
  it("null/empty は / にフォールバック", () => {
    expect(isSafeNext(null)).toBe("/");
    expect(isSafeNext("")).toBe("/");
  });

  it("/ で始まる相対パスは許可", () => {
    expect(isSafeNext("/")).toBe("/");
    expect(isSafeNext("/lesson/zaimu-roe")).toBe("/lesson/zaimu-roe");
    expect(isSafeNext("/dashboard?tab=overview")).toBe(
      "/dashboard?tab=overview",
    );
    expect(isSafeNext("/highlights#top")).toBe("/highlights#top");
  });

  it("プロトコル相対 //evil.com は拒否", () => {
    expect(isSafeNext("//evil.com")).toBe("/");
    expect(isSafeNext("//evil.com/path")).toBe("/");
  });

  it("バックスラッシュ /\\ は拒否（一部ブラウザの解釈差）", () => {
    expect(isSafeNext("/\\evil.com")).toBe("/");
    expect(isSafeNext("/\\\\evil.com")).toBe("/");
  });

  it("絶対 URL は拒否", () => {
    expect(isSafeNext("https://evil.com")).toBe("/");
    expect(isSafeNext("http://evil.com")).toBe("/");
  });

  it("javascript: scheme は拒否", () => {
    expect(isSafeNext("javascript:alert(1)")).toBe("/");
  });

  it("先頭スラッシュなしは拒否", () => {
    expect(isSafeNext("dashboard")).toBe("/");
    expect(isSafeNext("./relative")).toBe("/");
  });
});
