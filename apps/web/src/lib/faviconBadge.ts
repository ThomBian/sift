// Base mark kept in sync with public/favicon.svg (dark rounded square +
// #5E6AD2 checkmark). Duplicated here so the generated favicon is
// self-contained and does not depend on fetching the static asset.
const BASE_MARK = `
  <rect width="32" height="32" rx="6" fill="#080808" stroke="#222" />
  <path d="M9 16.5l4.5 4L23 11" stroke="#5E6AD2" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
`;

function badgeText(count: number): string {
  return count > 99 ? "99+" : String(count);
}

/** SVG markup for the favicon. No badge when count <= 0. */
export function buildFaviconSvg(count: number): string {
  if (count <= 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">${BASE_MARK}</svg>`;
  }
  const text = badgeText(count);
  // Wider badge text (99+) gets a slightly smaller font to stay legible at 16px.
  const fontSize = text.length > 2 ? 9 : 11;
  const badge = `
    <circle cx="24" cy="8" r="7" fill="#FF4F00" />
    <text x="24" y="8" fill="#FFFFFF" font-size="${fontSize}"
      font-family="-apple-system, system-ui, sans-serif" font-weight="700"
      text-anchor="middle" dominant-baseline="central">${text}</text>
  `;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">${BASE_MARK}${badge}</svg>`;
}

/** Tab title. Plain "Sift" when count <= 0, else "(N) Sift". */
export function buildTabTitle(count: number): string {
  return count > 0 ? `(${count}) Sift` : "Sift";
}

/** Encode SVG markup as a data URI usable as a <link rel="icon"> href. */
export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
