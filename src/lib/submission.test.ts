import { describe, expect, it } from "vitest";
import { EMPTY_SUBMISSION, validateSubmission } from "@/lib/submission";

function form(patch: Partial<typeof EMPTY_SUBMISSION> = {}) {
  return { ...EMPTY_SUBMISSION, ...patch };
}

describe("submission validation", () => {
  it("requires a name, province and description", () => {
    const errors = validateSubmission(EMPTY_SUBMISSION);
    expect(errors.name).toBeDefined();
    expect(errors.province).toBeDefined();
    expect(errors.description).toBeDefined();
  });

  it("accepts a complete, plausible submission", () => {
    const errors = validateSubmission(
      form({
        name: "โรงภาพยนตร์ร้างศรีเกษม",
        province: "bangkok",
        description: "อาคารโรงภาพยนตร์เก่าสามชั้น ผนังปูนเปลือย มีป้ายไฟเก่าหลงเหลือและบันไดวนที่ยังใช้งานได้",
        coordinates: "13.75630, 100.50180",
        sourceUrl: "https://commons.wikimedia.org/wiki/Category:Srikesem",
        email: "location@studio.co",
      }),
    );
    expect(errors).toEqual({});
  });

  it("rejects coordinates outside Thailand", () => {
    const errors = validateSubmission(
      form({
        name: "Test",
        province: "bangkok",
        description: "ก".repeat(40),
        coordinates: "51.5074, -0.1278",
      }),
    );
    expect(errors.coordinates).toContain("นอกประเทศไทย");
  });

  it("rejects malformed coordinates", () => {
    const errors = validateSubmission(
      form({ name: "Test", province: "bangkok", description: "ก".repeat(40), coordinates: "13.75N 100.5E" }),
    );
    expect(errors.coordinates).toBeDefined();
  });

  it("rejects non-http source links", () => {
    const errors = validateSubmission(
      form({
        name: "Test",
        province: "bangkok",
        description: "ก".repeat(40),
        sourceUrl: "javascript:alert(1)",
      }),
    );
    expect(errors.sourceUrl).toBeDefined();
  });

  it("rejects malformed email but allows an empty one", () => {
    const base = { name: "Test", province: "bangkok", description: "ก".repeat(40) };
    expect(validateSubmission(form({ ...base, email: "not-an-email" })).email).toBeDefined();
    expect(validateSubmission(form({ ...base, email: "" })).email).toBeUndefined();
  });
});
