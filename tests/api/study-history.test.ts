import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkAndRecord: vi.fn(),
}));

const { createClient } = await import("@/lib/supabase/server");
const { getAdminClient } = await import("@/lib/supabase/admin");
const { checkAndRecord } = await import("@/lib/rate-limit");
const { POST } = await import("@/app/api/study-history/route");

function makeAuthClient(user: { id: string } | null) {
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user } })) },
  };
}

function makeAdmin(opts: { insertError?: { message: string } | null } = {}) {
  const builder = {
    insert: vi.fn(async () => ({ error: opts.insertError ?? null })),
  };
  return { from: vi.fn(() => builder), _builder: builder };
}

function makeRequest(body: unknown, raw = false): Request {
  return new Request("http://test/api/study-history", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(checkAndRecord).mockResolvedValue({ ok: true });
});

describe("POST /api/study-history", () => {
  it("401: 未認証", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthClient(null) as never,
    );
    vi.mocked(getAdminClient).mockReturnValue(makeAdmin() as never);
    const res = await POST(
      makeRequest({ topicId: "zaimu-roe", quizScore: 2 }),
    );
    expect(res.status).toBe(401);
  });

  it("400: invalid body（quizScore 範囲外）", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthClient({ id: "u1" }) as never,
    );
    vi.mocked(getAdminClient).mockReturnValue(makeAdmin() as never);
    const res = await POST(
      makeRequest({ topicId: "zaimu-roe", quizScore: 5 }),
    );
    expect(res.status).toBe(400);
  });

  it("404: 不在 topic", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthClient({ id: "u1" }) as never,
    );
    vi.mocked(getAdminClient).mockReturnValue(makeAdmin() as never);
    const res = await POST(
      makeRequest({ topicId: "no-such", quizScore: 2 }),
    );
    expect(res.status).toBe(404);
  });

  it("200: subject_id をサーバー側で解決して INSERT", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthClient({ id: "u1" }) as never,
    );
    const admin = makeAdmin();
    vi.mocked(getAdminClient).mockReturnValue(admin as never);
    const res = await POST(
      makeRequest({ topicId: "zaimu-roe", quizScore: 3, quizTotal: 3 }),
    );
    expect(res.status).toBe(200);
    expect(admin._builder.insert).toHaveBeenCalledWith({
      user_id: "u1",
      topic_id: "zaimu-roe",
      subject_id: "zaimu",
      quiz_score: 3,
      quiz_total: 3,
    });
  });

  it("429: レート制限超過時は Retry-After 付きで返却、INSERT は呼ばない", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthClient({ id: "u1" }) as never,
    );
    const admin = makeAdmin();
    vi.mocked(getAdminClient).mockReturnValue(admin as never);
    vi.mocked(checkAndRecord).mockResolvedValue({
      ok: false,
      retryAfter: 60,
    });

    const res = await POST(
      makeRequest({ topicId: "zaimu-roe", quizScore: 2 }),
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    expect(admin._builder.insert).not.toHaveBeenCalled();
  });

  it("500: INSERT エラー", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthClient({ id: "u1" }) as never,
    );
    vi.mocked(getAdminClient).mockReturnValue(
      makeAdmin({ insertError: { message: "DB down" } }) as never,
    );
    const res = await POST(
      makeRequest({ topicId: "zaimu-roe", quizScore: 1 }),
    );
    expect(res.status).toBe(500);
  });
});
