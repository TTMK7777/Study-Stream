import { describe, it, expect, vi, beforeEach } from "vitest";

const signInWithOtpMock = vi.fn();

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ host: "localhost:3000" })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithOtp: signInWithOtpMock,
      signOut: vi.fn(async () => ({ error: null })),
    },
  })),
}));

beforeEach(() => {
  signInWithOtpMock.mockReset();
});

describe("login/actions: signInWithMagicLink", () => {
  it("不正なメール形式は ok:false を返し、API は呼ばれない", async () => {
    const { signInWithMagicLink } = await import("@/app/login/actions");

    for (const bad of ["", "no-at-sign", "no-domain@", "@no-local"]) {
      const result = await signInWithMagicLink(bad);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("形式");
      }
    }
    expect(signInWithOtpMock).not.toHaveBeenCalled();
  });

  it("正常メールは signInWithOtp を呼び ok:true を返す", async () => {
    signInWithOtpMock.mockResolvedValueOnce({ error: null });
    const { signInWithMagicLink } = await import("@/app/login/actions");

    const result = await signInWithMagicLink("user@example.com");
    expect(result.ok).toBe(true);
    expect(signInWithOtpMock).toHaveBeenCalledWith({
      email: "user@example.com",
      options: {
        emailRedirectTo: expect.stringMatching(/\/auth\/callback\?next=\/$/),
      },
    });
  });

  it("Supabase エラーは ok:false で返却される", async () => {
    signInWithOtpMock.mockResolvedValueOnce({
      error: { message: "rate limit exceeded" },
    });
    const { signInWithMagicLink } = await import("@/app/login/actions");

    const result = await signInWithMagicLink("user@example.com");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("rate limit exceeded");
    }
  });
});
