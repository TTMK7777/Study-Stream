import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: vi.fn(),
}));

vi.mock("@/lib/anthropic/generators", () => ({
  generateLesson: vi.fn(),
  generateQuiz: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkAndRecord: vi.fn(),
  checkMonthlyQuota: vi.fn(),
}));

vi.mock("@/lib/anthropic", () => ({
  ANTHROPIC_MODEL: "claude-sonnet-test",
  PROMPT_VERSION: 1,
}));

const { createClient } = await import("@/lib/supabase/server");
const { getAdminClient } = await import("@/lib/supabase/admin");
const { generateLesson, generateQuiz } = await import(
  "@/lib/anthropic/generators"
);
const { checkAndRecord, checkMonthlyQuota } = await import(
  "@/lib/rate-limit"
);
const { POST } = await import("@/app/api/lesson/route");

type AdminMock = ReturnType<typeof makeAdmin>;

function makeAdmin(opts: {
  cacheData?: unknown;
  cacheError?: { message: string } | null;
  insertError?: { message: string } | null;
} = {}) {
  const cacheBuilder = {
    select: vi.fn(() => cacheBuilder),
    eq: vi.fn(() => cacheBuilder),
    maybeSingle: vi.fn(async () => ({
      data: opts.cacheData ?? null,
      error: opts.cacheError ?? null,
    })),
    insert: vi.fn(async () => ({ error: opts.insertError ?? null })),
  };
  return {
    from: vi.fn(() => cacheBuilder),
    _cacheBuilder: cacheBuilder,
  };
}

function makeAuthClient(user: { id: string } | null) {
  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user } })),
    },
  };
}

function makeRequest(body: unknown, raw = false): Request {
  return new Request("http://test/api/lesson", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

const FAKE_LESSON = {
  title: "ROE 分解",
  subtitle: "デュポン分析の概要",
  sections: [],
  key_points: [],
};
const FAKE_QUIZ = [{ question: "q1" }];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/lesson", () => {
  it("401: 未認証ユーザーは unauthorized", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthClient(null) as never,
    );
    vi.mocked(getAdminClient).mockReturnValue(makeAdmin() as never);

    const res = await POST(makeRequest({ topicId: "zaimu-roe" }));
    expect(res.status).toBe(401);
  });

  it("400: 不正な JSON", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthClient({ id: "u1" }) as never,
    );
    vi.mocked(getAdminClient).mockReturnValue(makeAdmin() as never);

    const res = await POST(makeRequest("{not-json", true));
    expect(res.status).toBe(400);
  });

  it("400: topicId 欠如のリクエストは invalid body", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthClient({ id: "u1" }) as never,
    );
    vi.mocked(getAdminClient).mockReturnValue(makeAdmin() as never);

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("404: 実在しない topicId は topic not found", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthClient({ id: "u1" }) as never,
    );
    vi.mocked(getAdminClient).mockReturnValue(makeAdmin() as never);

    const res = await POST(makeRequest({ topicId: "no-such-topic" }));
    expect(res.status).toBe(404);
  });

  it("200 cached: cache hit のとき generator も rate-limit も呼ばれない", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthClient({ id: "u1" }) as never,
    );
    const admin = makeAdmin({
      cacheData: { lesson_json: FAKE_LESSON, quiz_json: FAKE_QUIZ },
    });
    vi.mocked(getAdminClient).mockReturnValue(admin as never);

    const res = await POST(makeRequest({ topicId: "zaimu-roe" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cached).toBe(true);
    expect(body.lesson.title).toContain("ROE");
    expect(generateLesson).not.toHaveBeenCalled();
    expect(generateQuiz).not.toHaveBeenCalled();
    expect(checkAndRecord).not.toHaveBeenCalled();
  });

  it("200 generated: cache miss で並列生成 → INSERT → cached:false", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthClient({ id: "u1" }) as never,
    );
    const admin = makeAdmin();
    vi.mocked(getAdminClient).mockReturnValue(admin as never);
    vi.mocked(checkMonthlyQuota).mockResolvedValue({ ok: true });
    vi.mocked(checkAndRecord).mockResolvedValue({ ok: true });
    vi.mocked(generateLesson).mockResolvedValue({
      data: FAKE_LESSON as never,
      retried: false,
    });
    vi.mocked(generateQuiz).mockResolvedValue({
      data: FAKE_QUIZ as never,
      retried: false,
    });

    const res = await POST(makeRequest({ topicId: "zaimu-roe" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cached).toBe(false);
    expect(generateLesson).toHaveBeenCalledTimes(1);
    expect(generateQuiz).toHaveBeenCalledTimes(1);
    expect(checkAndRecord).toHaveBeenCalledWith(
      "u1",
      "/api/lesson",
      expect.anything(),
    );
    expect(admin._cacheBuilder.insert).toHaveBeenCalled();
  });

  it("429: 分次 rate-limit 超過時は Retry-After 付きで返却", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthClient({ id: "u1" }) as never,
    );
    vi.mocked(getAdminClient).mockReturnValue(makeAdmin() as never);
    vi.mocked(checkMonthlyQuota).mockResolvedValue({ ok: true });
    vi.mocked(checkAndRecord).mockResolvedValue({
      ok: false,
      retryAfter: 60,
    });

    const res = await POST(makeRequest({ topicId: "zaimu-roe" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    expect(generateLesson).not.toHaveBeenCalled();
  });

  it("429 monthly user: 個人月次クォータ超過は user reason で返却", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthClient({ id: "u1" }) as never,
    );
    vi.mocked(getAdminClient).mockReturnValue(makeAdmin() as never);
    vi.mocked(checkMonthlyQuota).mockResolvedValue({
      ok: false,
      reason: "user",
      current: 50,
    });

    const res = await POST(makeRequest({ topicId: "zaimu-roe" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("86400");
    const body = await res.json();
    expect(body.error).toContain("user quota");
    expect(generateLesson).not.toHaveBeenCalled();
    expect(checkAndRecord).not.toHaveBeenCalled();
  });

  it("429 monthly global: 全体月次予算到達は global reason で返却", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthClient({ id: "u1" }) as never,
    );
    vi.mocked(getAdminClient).mockReturnValue(makeAdmin() as never);
    vi.mocked(checkMonthlyQuota).mockResolvedValue({
      ok: false,
      reason: "global",
      current: 200,
    });

    const res = await POST(makeRequest({ topicId: "zaimu-roe" }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain("global budget");
  });

  it("502: generator throw 時は generation failed", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthClient({ id: "u1" }) as never,
    );
    vi.mocked(getAdminClient).mockReturnValue(makeAdmin() as never);
    vi.mocked(checkMonthlyQuota).mockResolvedValue({ ok: true });
    vi.mocked(checkAndRecord).mockResolvedValue({ ok: true });
    vi.mocked(generateLesson).mockRejectedValue(new Error("anthropic 5xx"));
    vi.mocked(generateQuiz).mockResolvedValue({
      data: FAKE_QUIZ as never,
      retried: false,
    });

    const res = await POST(makeRequest({ topicId: "zaimu-roe" }));
    expect(res.status).toBe(502);
  });

  it("INSERT で uniqueIndex 違反は無視され 200 を返す", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthClient({ id: "u1" }) as never,
    );
    const admin = makeAdmin({
      insertError: { message: "duplicate key value violates unique constraint" },
    });
    vi.mocked(getAdminClient).mockReturnValue(admin as never);
    vi.mocked(checkMonthlyQuota).mockResolvedValue({ ok: true });
    vi.mocked(checkAndRecord).mockResolvedValue({ ok: true });
    vi.mocked(generateLesson).mockResolvedValue({
      data: FAKE_LESSON as never,
      retried: false,
    });
    vi.mocked(generateQuiz).mockResolvedValue({
      data: FAKE_QUIZ as never,
      retried: false,
    });

    const res = await POST(makeRequest({ topicId: "zaimu-roe" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cached).toBe(false);
  });

  it("cache lookup エラー時は 500", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthClient({ id: "u1" }) as never,
    );
    const admin = makeAdmin({
      cacheError: { message: "DB connection lost" },
    });
    vi.mocked(getAdminClient).mockReturnValue(admin as never);

    const res = await POST(makeRequest({ topicId: "zaimu-roe" }));
    expect(res.status).toBe(500);
  });
});
