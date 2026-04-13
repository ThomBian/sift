// packages/shared/src/__tests__/SmartInput.test.tsx
import { type ComponentProps } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  {
    id: "proj-2",
    name: "Auth PR",
    emoji: "📚",
    spaceId: "space-2",
    dueDate: null,
    archived: false,
    url: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    synced: false,
    space: {
      id: "space-2",
      name: "Work",
      color: "#e05252",
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: false,
    },
  },
];

type SmartInputProps = ComponentProps<typeof SmartInput>;

describe("SmartInput", () => {
  let onTaskReady: SmartInputProps["onTaskReady"];

  beforeEach(() => {
    onTaskReady = vi.fn() as SmartInputProps["onTaskReady"];
  });

  it("renders the input and four chip buttons", () => {
    render(<SmartInput projects={mockProjects} onTaskReady={onTaskReady} />);
    expect(
      screen.getByRole("textbox", { name: /task title/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Project (@p)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Due date (@d)" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Working date (@w)" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Link (@u)" })).toBeInTheDocument();
  });

  it("clicking the @u chip shows link placeholder (no project/date dropdown)", async () => {
    render(
      <SmartInput
        projects={mockProjects}
        onTaskReady={onTaskReady}
        dropdownPosition="inline"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Link (@u)" }));
    expect(screen.getByPlaceholderText("Add a link…")).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /General/ })).toBeNull();
  });

  it("clicking the @p chip opens the project dropdown", async () => {
    render(<SmartInput projects={mockProjects} onTaskReady={onTaskReady} />);
    await userEvent.click(screen.getByRole("button", { name: "Project (@p)" }));
    expect(screen.getByRole("option", { name: /General/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Auth PR/ })).toBeInTheDocument();
  });

  it("selecting a project from the dropdown updates the chip label", async () => {
    render(<SmartInput projects={mockProjects} onTaskReady={onTaskReady} />);
    await userEvent.click(screen.getByRole("button", { name: "Project (@p)" }));
    await userEvent.click(screen.getByRole("option", { name: /General/ }));
    expect(screen.getByRole("button", { name: "Project (@p)" })).toHaveTextContent(
      "General",
    );
  });

  it("clicking the @d chip opens the date dropdown", async () => {
    render(<SmartInput projects={mockProjects} onTaskReady={onTaskReady} />);
    await userEvent.click(screen.getByRole("button", { name: "Due date (@d)" }));

    // Instead of looking for role="option", check for visible date cells (td elements with role="gridcell")
    // rendered by the Calendar component within the dropdown.
    const dateCells = screen.getAllByRole("gridcell");
    expect(dateCells.length).toBeGreaterThan(0); // Ensure some date cells are rendered.
  });

  it("⌘+Enter calls onTaskReady with the entered title", async () => {
    render(<SmartInput projects={mockProjects} onTaskReady={onTaskReady} />);
    const input = screen.getByRole("textbox", { name: /task title/i });
    await userEvent.type(input, "Buy milk");
    fireEvent.keyDown(input, { key: "Enter", metaKey: true });
    expect(onTaskReady).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Buy milk" }),
    );
  });

  it("does not call onTaskReady when title is empty", async () => {
    render(<SmartInput projects={mockProjects} onTaskReady={onTaskReady} />);
    const input = screen.getByRole("textbox", { name: /task title/i });
    fireEvent.keyDown(input, { key: "Enter", metaKey: true });
    expect(onTaskReady).not.toHaveBeenCalled();
  });

  it("shows distinct due vs working date picker copy in inline mode", async () => {
    render(
      <SmartInput
        projects={mockProjects}
        onTaskReady={onTaskReady}
        dropdownPosition="inline"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Due date (@d)" }));
    expect(
      screen.getByRole("heading", { level: 2, name: "Due date" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("When this must be finished."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: /due date/i }),
    ).toHaveAttribute(
      "placeholder",
      "Due date — type or pick below…",
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Working date (@w)" }),
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Working date" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("The day it appears on Today."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: /working date/i }),
    ).toHaveAttribute(
      "placeholder",
      "Working date — type or pick below…",
    );
  });

  it("resets the input after successful save", async () => {
    render(<SmartInput projects={mockProjects} onTaskReady={onTaskReady} />);
    const input = screen.getByRole("textbox", { name: /task title/i });
    await userEvent.type(input, "Some task");
    fireEvent.keyDown(input, { key: "Enter", metaKey: true });
    expect(input).toHaveValue("");
  });
});
