import { describe, expect, it } from "vitest";
import {
  clamp,
  decodeBoardShare,
  encodeBoardShare,
  formatCoords,
  formatKm,
  formatThaiDate,
  haversineKm,
  pct,
  safeExternalUrl,
  stripHtml,
  uid,
} from "@/lib/utils";

describe("haversineKm", () => {
  it("measures Bangkok to Chiang Mai within a realistic range", () => {
    const km = haversineKm({ lat: 13.7563, lng: 100.5018 }, { lat: 18.7883, lng: 98.9853 });
    expect(km).toBeGreaterThan(560);
    expect(km).toBeLessThan(610);
  });

  it("returns zero for the same point", () => {
    expect(haversineKm({ lat: 13.75, lng: 100.5 }, { lat: 13.75, lng: 100.5 })).toBeCloseTo(0, 6);
  });
});

describe("formatting", () => {
  it("formats short, medium and long distances", () => {
    expect(formatKm(0.42)).toBe("420 ม.");
    expect(formatKm(4.26)).toBe("4.3 กม.");
    expect(formatKm(126.4)).toBe("126 กม.");
    expect(formatKm(Number.NaN)).toBe("—");
  });

  it("formats coordinates with five decimals", () => {
    expect(formatCoords(13.7563, 100.5018)).toBe("13.75630, 100.50180");
  });

  it("returns a dash for invalid dates", () => {
    expect(formatThaiDate(null)).toBe("—");
    expect(formatThaiDate("not-a-date")).toBe("—");
    expect(formatThaiDate("2026-11-20T00:00:00.000Z")).not.toBe("—");
  });

  it("clamps and renders percentages", () => {
    expect(clamp(12, 0, 10)).toBe(10);
    expect(clamp(-2, 0, 10)).toBe(0);
    expect(pct(0.734)).toBe("73%");
    expect(pct(2)).toBe("100%");
  });
});

describe("safeExternalUrl", () => {
  it("accepts http and https", () => {
    expect(safeExternalUrl("https://commons.wikimedia.org/wiki/File:X.jpg")).toContain("https://");
    expect(safeExternalUrl("http://example.com")).toBe("http://example.com/");
  });

  it("rejects javascript, data and malformed URLs", () => {
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("data:text/html,<script>")).toBeNull();
    expect(safeExternalUrl("not a url")).toBeNull();
    expect(safeExternalUrl(null)).toBeNull();
  });
});

describe("board sharing", () => {
  it("round-trips unicode content", () => {
    const board = {
      title: "MV: เมืองร้าง",
      items: [{ slug: "wat-arun", notes: "ถ่ายตอนเช้า" }],
    };
    const encoded = encodeBoardShare(board);
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
    expect(encoded).not.toContain("=");
    expect(decodeBoardShare<typeof board>(encoded)).toEqual(board);
  });

  it("returns null for corrupted payloads", () => {
    expect(decodeBoardShare("%%%")).toBeNull();
  });
});

describe("misc helpers", () => {
  it("strips html tags", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("creates prefixed unique ids", () => {
    const a = uid("board");
    const b = uid("board");
    expect(a.startsWith("board_")).toBe(true);
    expect(a).not.toBe(b);
  });
});
