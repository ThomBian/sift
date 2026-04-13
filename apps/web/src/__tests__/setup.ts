import "fake-indexeddb/auto";
import "../../../../packages/shared/src/design-tokens.css";
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
