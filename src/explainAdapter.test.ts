import { describe, it, expect } from "vitest";
import {
  explainAvailability,
  explainAvailabilitySync,
  type ExplainInput,
  type ReasonCode,
} from "./explainAdapter";

function validInput(overrides: Partial<ExplainInput> = {}): ExplainInput {
  return {
    roomLabel: "Engineering Lab 101",
    startTime: "10:00",
    endTime: "11:00",
    isAvailable: true,
    reasonCode: "available",
    ...overrides,
  };
}

describe("Explain adapter — normal cases", () => {
  it("explains an available slot", async () => {
    const res = await explainAvailability(validInput());
    expect(res.explanation).toContain("Engineering Lab 101");
    expect(res.explanation).toContain("free");
    expect(res.explanation).toContain("10:00 to 11:00");
  });

  it("explains an overlap (unavailable) slot", async () => {
    const res = await explainAvailability(
      validInput({
        isAvailable: false,
        reasonCode: "overlap",
        startTime: "14:00",
        endTime: "15:00",
      }),
    );
    expect(res.explanation).toContain("overlaps");
    expect(res.explanation).toContain("14:00 to 15:00");
  });

  it("explains a blocked room", async () => {
    const res = await explainAvailability(
      validInput({ isAvailable: false, reasonCode: "blocked" }),
    );
    expect(res.explanation).toContain("blocked");
  });

  it("explains an invalid/past time", async () => {
    const res = await explainAvailability(
      validInput({
        isAvailable: false,
        reasonCode: "past_time",
        startTime: "08:00",
        endTime: "09:00",
      }),
    );
    expect(res.explanation).toContain("past");
    expect(res.explanation).toContain("08:00");
  });
});

describe("Explain adapter — explanation is at most two sentences", () => {
  const allReasonCodes: { reasonCode: ReasonCode; isAvailable: boolean }[] = [
    { reasonCode: "available", isAvailable: true },
    { reasonCode: "overlap", isAvailable: false },
    { reasonCode: "blocked", isAvailable: false },
    { reasonCode: "invalid_time", isAvailable: false },
    { reasonCode: "past_time", isAvailable: false },
    { reasonCode: "duration_exceeded", isAvailable: false },
  ];

  it.each(allReasonCodes)(
    "$reasonCode explanation has ≤ 2 sentences",
    ({ reasonCode, isAvailable }) => {
      const res = explainAvailabilitySync(
        validInput({ reasonCode, isAvailable }),
      );
      const sentenceCount = (res.explanation.match(/\./g) || []).length;
      expect(sentenceCount).toBeLessThanOrEqual(2);
    },
  );
});

describe("Explain adapter — input validation failures", () => {
  it("rejects empty roomLabel with fallback message", async () => {
    const res = await explainAvailability(
      validInput({ roomLabel: "" }),
    );
    expect(res.explanation).toMatch(/couldn't generate/i);
  });

  it("rejects overly long input (> 200 chars combined) with fallback", async () => {
    const longLabel = "A".repeat(201);
    const res = await explainAvailability(validInput({ roomLabel: longLabel }));
    expect(res.explanation).toMatch(/couldn't generate/i);
  });

  it("rejects non-object input (null) with fallback", async () => {
    const res = await explainAvailability(null);
    expect(res.explanation).toMatch(/couldn't generate/i);
  });

  it("rejects invalid reasonCode with fallback", async () => {
    const res = await explainAvailability(
      validInput({ reasonCode: "bogus" as never }),
    );
    expect(res.explanation).toMatch(/couldn't generate/i);
  });

  it("rejects isAvailable=true with reasonCode 'overlap' (semantic mismatch)", async () => {
    const res = await explainAvailability(
      validInput({ isAvailable: true, reasonCode: "overlap" }),
    );
    expect(res.explanation).toMatch(/couldn't generate/i);
  });

  it("rejects isAvailable=false with reasonCode 'available' (semantic mismatch)", async () => {
    const res = await explainAvailability(
      validInput({ isAvailable: false, reasonCode: "available" }),
    );
    expect(res.explanation).toMatch(/couldn't generate/i);
  });
});

describe("Explain adapter — simulated failure modes", () => {
  it("returns fallback on simulated timeout (sync)", () => {
    const res = explainAvailabilitySync(validInput(), "timeout");
    expect(res.explanation).toMatch(/couldn't generate/i);
  });

  it("throws on simulated API error (sync)", () => {
    expect(() => explainAvailabilitySync(validInput(), "api_error")).toThrow(
      "Simulated API error",
    );
  });

  it("returns fallback on simulated timeout (async)", async () => {
    await expect(explainAvailability(validInput(), "timeout")).rejects.toThrow(
      "timed out",
    );
  });

  it("throws on simulated API error (async)", async () => {
    await expect(explainAvailability(validInput(), "api_error")).rejects.toThrow(
      "Simulated API error",
    );
  });
});
