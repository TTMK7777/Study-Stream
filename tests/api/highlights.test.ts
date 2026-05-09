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
const { GET, POST, DELETE } = await import("@/app/api/highlights/route");

function makeAuth(user: { id: string } | null) {
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user } })) },
  };
}

function makeAdmin(opts: {
  selectData?: unknown[];
  selectError?: { message: string } | null;
  insertData?: { id: string };
  insertError?: { message: string } | null;
  deleteError?: { message: string } | null;
} = {}) {
  // builder is reused for all chains; methods return same builder
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.limit = vi.fn(async () => ({
    data: opts.selectData ?? [],
    error: opts.selectError ?? null,
  }));
  builder.single = vi.fn(async () => ({
    data: opts.insertData ?? { id: "new-id" },
    error: opts.insertError ?? null,
  }));
  builder.insert = vi.fn(() => builder);
  builder.delete = vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(async () => ({ error: opts.deleteError ?? null })),
    })),
  }));
  return { from: vi.fn(() => builder), _builder: builder };
}

function makeReq(body: unknown, raw = false): Request {
  return new Request("http://test/api/highlights", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(checkAndRecord).mockResolvedValue({ ok: true });
});

describe("GET /api/highlights", () => {
  it("401: 未認証", async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuth(null) as never);
    vi.mocked(getAdminClient).mockReturnValue(makeAdmin() as never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("200: 自分の行を返す", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuth({ id: "u1" }) as never,
    );
    const admin = makeAdmin({
      selectData: [
        {
          id: "h1",
          topic_id: "zaimu-roe",
          section_heading: "ROE の定義",
          text: "ROE は...",
          note: null,
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
    });
    vi.mocked(getAdminClient).mockReturnValue(admin as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
  });

  it("500: SELECT エラー", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuth({ id: "u1" }) as never,
    );
    vi.mocked(getAdminClient).mockReturnValue(
      makeAdmin({ selectError: { message: "DB" } }) as never,
    );
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("POST /api/highlights", () => {
  it("401: 未認証", async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuth(null) as never);
    vi.mocked(getAdminClient).mockReturnValue(makeAdmin() as never);
    const res = await POST(
      makeReq({
        topicId: "zaimu-roe",
        sectionHeading: "ROE",
        text: "abc",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("400: text 空", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuth({ id: "u1" }) as never,
    );
    vi.mocked(getAdminClient).mockReturnValue(makeAdmin() as never);
    const res = await POST(
      makeReq({ topicId: "zaimu-roe", sectionHeading: "ROE", text: "" }),
    );
    expect(res.status).toBe(400);
  });

  it("404: 不在 topic", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuth({ id: "u1" }) as never,
    );
    vi.mocked(getAdminClient).mockReturnValue(makeAdmin() as never);
    const res = await POST(
      makeReq({
        topicId: "no-such",
        sectionHeading: "x",
        text: "y",
      }),
    );
    expect(res.status).toBe(404);
  });

  it("429: レート制限超過時は Retry-After 付きで返却", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuth({ id: "u1" }) as never,
    );
    vi.mocked(getAdminClient).mockReturnValue(makeAdmin() as never);
    vi.mocked(checkAndRecord).mockResolvedValue({
      ok: false,
      retryAfter: 60,
    });
    const res = await POST(
      makeReq({
        topicId: "zaimu-roe",
        sectionHeading: "ROE",
        text: "ROE は...",
      }),
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("200: INSERT 成功で id を返す", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuth({ id: "u1" }) as never,
    );
    vi.mocked(getAdminClient).mockReturnValue(
      makeAdmin({ insertData: { id: "abc-123" } }) as never,
    );
    const res = await POST(
      makeReq({
        topicId: "zaimu-roe",
        sectionHeading: "ROE",
        text: "ROE は...",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("abc-123");
  });
});

describe("DELETE /api/highlights", () => {
  it("401: 未認証", async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuth(null) as never);
    vi.mocked(getAdminClient).mockReturnValue(makeAdmin() as never);
    const res = await DELETE(
      makeReq({ id: "00000000-0000-4000-8000-000000000000" }),
    );
    expect(res.status).toBe(401);
  });

  it("400: id が UUID でない", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuth({ id: "u1" }) as never,
    );
    vi.mocked(getAdminClient).mockReturnValue(makeAdmin() as never);
    const res = await DELETE(makeReq({ id: "not-uuid" }));
    expect(res.status).toBe(400);
  });

  it("200: 削除成功", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuth({ id: "u1" }) as never,
    );
    vi.mocked(getAdminClient).mockReturnValue(makeAdmin() as never);
    const res = await DELETE(
      makeReq({ id: "00000000-0000-4000-8000-000000000000" }),
    );
    expect(res.status).toBe(200);
  });

  it("429: DELETE もレート制限対象", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuth({ id: "u1" }) as never,
    );
    vi.mocked(getAdminClient).mockReturnValue(makeAdmin() as never);
    vi.mocked(checkAndRecord).mockResolvedValue({
      ok: false,
      retryAfter: 60,
    });
    const res = await DELETE(
      makeReq({ id: "00000000-0000-4000-8000-000000000000" }),
    );
    expect(res.status).toBe(429);
  });
});
