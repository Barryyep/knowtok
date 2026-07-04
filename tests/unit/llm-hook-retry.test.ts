import { beforeEach, describe, expect, test, vi } from "vitest";

// Shared mock for OpenAI's chat.completions.create — the module-level client
// caches a single instance, so we point every call at this same spy.
const createMock = vi.fn();

vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create: createMock } };
  },
}));

// getOpenAIEnv() throws unless these are present; set before the module loads.
process.env.OPENAI_API_KEY = "test-key";
process.env.OPENAI_MODEL_LOW_COST = "gpt-4o-mini";

import { generatePaperMetadata } from "@/lib/llm";

type MetaJson = {
  hook?: string;
  hookZh?: string;
  tags?: string[];
  humanCategory?: string;
  plainSummary?: string;
  plainSummaryZh?: string;
};

function completion(json: MetaJson) {
  return {
    choices: [{ message: { content: JSON.stringify(json) } }],
    usage: { prompt_tokens: 11, completion_tokens: 22 },
  };
}

const CLEAN: MetaJson = {
  hook: "A single answer uses as much water as a small bottle.",
  hookZh: "膝盖扫描现在只要原来的十二分之一时间。",
  tags: ["water", "ai"],
  humanCategory: "AI & Robots",
  plainSummary: "AI answers quietly use water to cool the machines behind them.",
  plainSummaryZh: "AI 回答会悄悄用掉冷却机器的水。",
};

// A clean hook that is clearly distinguishable from CLEAN for retry assertions.
const CLEAN_SECOND: MetaJson = {
  ...CLEAN,
  hook: "Training one big model emits as much carbon as five cars over their whole life.",
  hookZh: "训练一个大模型排的碳，相当于五辆车一生的排放。",
};

const input = {
  title: "Water footprint of LLM inference",
  abstract: "We measure resource use. It is large. It matters.",
  categories: ["cs.AI", "cs.LG"],
};

beforeEach(() => {
  createMock.mockReset();
});

describe("generatePaperMetadata — META_HOOK_PATTERN retry guard", () => {
  test("clean hook passes through with exactly one completion call", async () => {
    createMock.mockResolvedValueOnce(completion(CLEAN));

    const result = await generatePaperMetadata(input);

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(result.hook).toBe(CLEAN.hook);
    expect(result.hookZh).toBe(CLEAN.hookZh);
    expect(result.tokenInput).toBe(11);
    expect(result.tokenOutput).toBe(22);
  });

  test("meta-phrase hookZh triggers exactly one retry and returns the clean second result", async () => {
    createMock
      .mockResolvedValueOnce(
        completion({ ...CLEAN, hookZh: "一种新型MRI方法能将扫描时间缩短12倍。" }),
      )
      .mockResolvedValueOnce(completion(CLEAN_SECOND));

    const result = await generatePaperMetadata(input);

    expect(createMock).toHaveBeenCalledTimes(2);
    expect(result.hookZh).toBe(CLEAN_SECOND.hookZh);
  });

  test("second dirty result falls back to the first (still two calls)", async () => {
    createMock
      .mockResolvedValueOnce(
        completion({ ...CLEAN, hookZh: "一种新型MRI方法能将扫描时间缩短12倍。" }),
      )
      .mockResolvedValueOnce(
        completion({ ...CLEAN_SECOND, hookZh: "一个新系统能把手机视频变成立体场景。" }),
      );

    const result = await generatePaperMetadata(input);

    expect(createMock).toHaveBeenCalledTimes(2);
    // Falls back to the FIRST attempt's hookZh, not the still-dirty second.
    expect(result.hookZh).toBe("一种新型MRI方法能将扫描时间缩短12倍。");
  });

  test("catches '一个新系统' opener and retries", async () => {
    createMock
      .mockResolvedValueOnce(
        completion({ ...CLEAN, hookZh: "一个新系统能把手机视频变成立体场景。" }),
      )
      .mockResolvedValueOnce(completion(CLEAN_SECOND));

    const result = await generatePaperMetadata(input);

    expect(createMock).toHaveBeenCalledTimes(2);
    expect(result.hookZh).toBe(CLEAN_SECOND.hookZh);
  });

  test("catches emotional tail '真吓人' and retries", async () => {
    createMock
      .mockResolvedValueOnce(
        completion({ ...CLEAN, hookZh: "这颗行星表面温度高达上千度，真吓人。" }),
      )
      .mockResolvedValueOnce(completion(CLEAN_SECOND));

    await generatePaperMetadata(input);

    expect(createMock).toHaveBeenCalledTimes(2);
  });

  test("catches a trailing exclamation mark and retries", async () => {
    createMock
      .mockResolvedValueOnce(
        completion({ ...CLEAN, hookZh: "训练一个大模型排的碳相当于五辆车！" }),
      )
      .mockResolvedValueOnce(completion(CLEAN_SECOND));

    await generatePaperMetadata(input);

    expect(createMock).toHaveBeenCalledTimes(2);
  });

  test("catches English meta-description 'this new method' and retries", async () => {
    createMock
      .mockResolvedValueOnce(
        completion({ ...CLEAN, hook: "This new method can turn any video into 4D." }),
      )
      .mockResolvedValueOnce(completion(CLEAN_SECOND));

    const result = await generatePaperMetadata(input);

    expect(createMock).toHaveBeenCalledTimes(2);
    expect(result.hook).toBe(CLEAN_SECOND.hook);
  });

  test("catches English editorializing tail 'amazing.' and retries", async () => {
    createMock
      .mockResolvedValueOnce(
        completion({ ...CLEAN, hook: "A phone video becomes a walkable 3D scene, amazing." }),
      )
      .mockResolvedValueOnce(completion(CLEAN_SECOND));

    await generatePaperMetadata(input);

    expect(createMock).toHaveBeenCalledTimes(2);
  });

  test("does NOT false-positive a normal fact hook containing '一个'", async () => {
    createMock.mockResolvedValueOnce(
      completion({
        ...CLEAN,
        hookZh: "训练一个大模型排的碳，相当于五辆车一生的排放。",
        hook: "Training one big model emits as much carbon as five cars over their whole life.",
      }),
    );

    const result = await generatePaperMetadata(input);

    // No retry: the fact opens with a subject, not a "一种/一个 + method" template.
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(result.hookZh).toBe("训练一个大模型排的碳，相当于五辆车一生的排放。");
  });
});
