import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCompetitorRun,
  finishCompetitorRun,
  saveCompetitorArticle,
} from "@/lib/competitor-intelligence/repository";

const mockFrom = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: () => true,
  createAdminServerClient: () => ({
    from: mockFrom,
  }),
}));

describe("competitor repository writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSingle.mockResolvedValue({ data: { id: "run-1" }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockEq.mockReturnValue({
      maybeSingle: mockMaybeSingle,
      single: mockSingle,
    });
    mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect, error: null });
    mockUpdate.mockReturnValue({ eq: mockEq, error: null });
    mockFrom.mockReturnValue({
      insert: mockInsert,
      update: mockUpdate,
      select: mockSelect,
      eq: mockEq,
    });
  });

  it("creates a crawl run row", async () => {
    const runId = await createCompetitorRun();
    expect(runId).toBe("run-1");
    expect(mockFrom).toHaveBeenCalledWith("competitor_runs");
    expect(mockInsert).toHaveBeenCalledWith({ status: "running" });
  });

  it("inserts a new competitor article", async () => {
    const result = await saveCompetitorArticle({
      sourceId: "source-1",
      article: {
        url: "https://www.aajtak.in/story-1",
        title: "ब्रेकिंग",
        description: "विवरण",
        language: "hi",
      },
    });

    expect(result).toBe("inserted");
    expect(mockFrom).toHaveBeenCalledWith("competitor_articles");
    expect(mockInsert).toHaveBeenCalled();
  });

  it("finishes a crawl run with stats", async () => {
    await finishCompetitorRun({
      runId: "run-1",
      status: "completed",
      articlesFound: 10,
      articlesSaved: 4,
      errors: [],
    });

    expect(mockFrom).toHaveBeenCalledWith("competitor_runs");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "completed",
        articles_found: 10,
        articles_saved: 4,
      })
    );
  });
});
