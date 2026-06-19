import { describe, it, expect } from "vitest";
import {
  buildTabTitle,
  buildFaviconSvg,
  svgToDataUri,
} from "../lib/faviconBadge";

describe("buildTabTitle", () => {
  it("is plain Sift at zero", () => {
    expect(buildTabTitle(0)).toBe("Sift");
  });
  it("clamps negatives to plain Sift", () => {
    expect(buildTabTitle(-3)).toBe("Sift");
  });
  it("prefixes the count when positive", () => {
    expect(buildTabTitle(3)).toBe("(3) Sift");
  });
  it("shows the true number past 99", () => {
    expect(buildTabTitle(150)).toBe("(150) Sift");
  });
});

describe("buildFaviconSvg", () => {
  it("renders no badge at zero", () => {
    const svg = buildFaviconSvg(0);
    expect(svg).toContain("<svg");
    expect(svg).not.toContain("<circle");
  });
  it("renders the count for 1-99", () => {
    const svg = buildFaviconSvg(5);
    expect(svg).toContain("<circle");
    expect(svg).toContain(">5<");
  });
  it("caps the badge text at 99+", () => {
    const svg = buildFaviconSvg(100);
    expect(svg).toContain("99+");
  });
});

describe("svgToDataUri", () => {
  it("produces an svg data uri", () => {
    expect(svgToDataUri("<svg></svg>")).toMatch(/^data:image\/svg\+xml,/);
  });
});
