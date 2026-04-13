// packages/shared/src/__tests__/DropdownNavigation.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SmartInput } from "../SmartInput/SmartInput";
import type { ProjectWithSpace } from "../SmartInput/Dropdown";
import calendarStyles from "../Calendar/Calendar.module.css";

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
  afterEach(() => {
    vi.useRealTimers();
  });

  it("navigates the date dropdown with arrow keys", async () => {
    // Mock today
    const today = new Date(2026, 3, 10); // April 10, 2026
    vi.setSystemTime(today);

    const onTaskReady = vi.fn();
    render(<SmartInput projects={mockProjects} onTaskReady={onTaskReady} />);

    // 1. Open date dropdown (query is empty)
    fireEvent.click(screen.getByRole("button", { name: "Due date (@d)" }));

    // Press ArrowRight (today April 10 + 1 = April 11) — navigates only
    fireEvent.keyDown(window, { key: "ArrowRight" });
    // Arrow keys move the calendar cursor but do NOT commit — chip unchanged yet
    expect(screen.getByRole("button", { name: "Due date (@d)" })).not.toHaveTextContent(
      "11/04/2026",
    );
    // Enter commits the highlighted date
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByRole("button", { name: "Due date (@d)" })).toHaveTextContent(
      "11/04/2026",
    );

    // 2. Open it again (query is reset to empty); grid re-anchors on committed due date (Apr 11)
    fireEvent.click(screen.getByRole("button", { name: "Due date (@d)" }));

    // Press ArrowDown (April 11 + 7 = April 18) — navigates only
    fireEvent.keyDown(window, { key: "ArrowDown" });
    // Enter commits
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByRole("button", { name: "Due date (@d)" })).toHaveTextContent(
      "18/04/2026",
    );
  });

  it("shows default cursor styling on today when no date is committed or typed", () => {
    const today = new Date(2026, 3, 10);
    vi.setSystemTime(today);

    const { container } = render(
      <SmartInput projects={mockProjects} onTaskReady={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Due date (@d)" }));

    const cursorCell = container.querySelector(
      `.${calendarStyles.defaultCursor}`,
    );
    expect(cursorCell).toBeTruthy();
  });

  it("does not commit a date on Enter when nothing was typed or moved", () => {
    vi.setSystemTime(new Date(2026, 3, 10));

    render(<SmartInput projects={mockProjects} onTaskReady={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Due date (@d)" }));
    fireEvent.keyDown(window, { key: "Enter" });

    const dueChip = screen.getByRole("button", { name: "Due date (@d)" });
    expect(dueChip).toHaveTextContent("@d");
    expect(dueChip).toHaveTextContent("due");
    expect(dueChip).not.toHaveTextContent("04/2026");
  });

  it("does not commit a date when tabbing away from the due date chip", () => {
    vi.setSystemTime(new Date(2026, 3, 10));

    render(<SmartInput projects={mockProjects} onTaskReady={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Due date (@d)" }));

    const input = screen.getByRole("textbox", { name: "Due date" });
    fireEvent.keyDown(input, { key: "Tab", shiftKey: false });

    const dueChip = screen.getByRole("button", { name: "Due date (@d)" });
    expect(dueChip).not.toHaveTextContent("04/2026");
  });
});
