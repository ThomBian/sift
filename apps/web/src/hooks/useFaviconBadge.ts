import { useEffect } from "react";
import { useTodayTasks } from "./useTasks";
import {
  buildFaviconSvg,
  buildTabTitle,
  svgToDataUri,
} from "../lib/faviconBadge";

function ensureIconLink(): HTMLLinkElement {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  return link;
}

/** Live-updates the tab favicon + title with the Today task count. */
export function useFaviconBadge(): void {
  const count = useTodayTasks().length;

  useEffect(() => {
    const link = ensureIconLink();
    link.setAttribute("type", "image/svg+xml");
    link.setAttribute("href", svgToDataUri(buildFaviconSvg(count)));
    document.title = buildTabTitle(count);

    return () => {
      link.setAttribute("href", "/favicon.svg");
      document.title = "Sift";
    };
  }, [count]);
}
