// packages/shared/src/__tests__/DropdownNavigation.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SmartInput } from "../SmartInput/SmartInput";
import type { ProjectWithSpace } from "../SmartInput/Dropdown";

const mockProjects: ProjectWithSpace[] = [
  {
    id: "proj-1",
    name: "General",
    emoji: "📚",
    spaceId: "space-1",
    dueDate: null,
    archived: false,
    url: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    synced: false,
    space: {
      id: "space-1",
      name: "Personal",
      color: "#5E6AD2",
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: false,
    },
  },
];

describe("Dropdown Keyboard Navigation", () => {
  it("navigates the date dropdown with arrow keys", async () => {
    // Mock today
    const today = new Date(2026, 3, 10); // April 10, 2026
    vi.setSystemTime(today);

    const onTaskReady = vi.fn();
    render(<SmartInput projects={mockProjects} onTaskReady={onTaskReady} />);

    // 1. Open date dropdown (query is empty)
    fireEvent.click(screen.getByRole("button", { name: "dueDate" }));

    // Press ArrowRight (today April 10 + 1 = April 11) — navigates only
    fireEvent.keyDown(window, { key: "ArrowRight" });
    // Arrow keys move the calendar cursor but do NOT commit — chip unchanged yet
    expect(screen.getByRole("button", { name: "dueDate" })).not.toHaveTextContent(
      "11/04/2026",
    );
    // Enter commits the highlighted date
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByRole("button", { name: "dueDate" })).toHaveTextContent(
      "11/04/2026",
    );

    // 2. Open it again (query is reset to empty)
    fireEvent.click(screen.getByRole("button", { name: "dueDate" }));

    // Press ArrowDown (today April 10 + 7 = April 17) — navigates only
    fireEvent.keyDown(window, { key: "ArrowDown" });
    // Enter commits
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByRole("button", { name: "dueDate" })).toHaveTextContent(
      "17/04/2026",
    );
  });
});
