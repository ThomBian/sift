import { useState, useEffect, useRef, useMemo } from 'react';
import type { Task, ProjectWithSpace } from '@speedy/shared';

export type EditField = 'title' | 'dueDate' | 'workingDate' | 'project';
export type EditPatch = Partial<Pick<Task, 'title' | 'dueDate' | 'workingDate' | 'projectId'>>;

interface TaskEditPaletteProps {
  task: Task;
  defaultField: EditField;
  projects: ProjectWithSpace[];
  onSave: (patch: EditPatch) => void;
  onCancel: () => void;
}

interface DateOption {
  label: string;
  value: Date | null;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDateOptions(): DateOption[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  return [
    { label: `Today · ${formatDate(today)}`, value: today },
    { label: `Tomorrow · ${formatDate(tomorrow)}`, value: tomorrow },
    { label: `Next week · ${formatDate(nextWeek)}`, value: nextWeek },
    { label: 'Clear', value: null },
  ];
}

export default function TaskEditPalette({
  task,
  defaultField,
  projects,
  onSave,
  onCancel,
}: TaskEditPaletteProps) {
  const [title, setTitle] = useState(task.title);
  const [projectId, setProjectId] = useState(task.projectId);
  const [dueDate, setDueDate] = useState<Date | null>(task.dueDate);
  const [workingDate, setWorkingDate] = useState<Date | null>(task.workingDate);
  const [activeChip, setActiveChip] = useState<EditField>(defaultField);
  const [search, setSearch] = useState('');
  const [dropdownIndex, setDropdownIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const dateOptions = useMemo(() => getDateOptions(), []);

  const filteredProjects = useMemo(
    () => projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [projects, search]
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const showDropdown =
    activeChip === 'dueDate' || activeChip === 'workingDate' || activeChip === 'project';

  function buildPatch(): EditPatch {
    return { title, projectId, dueDate, workingDate };
  }

  function selectDateOption(option: DateOption) {
    if (activeChip === 'dueDate') {
      setDueDate(option.value);
      onSave({ ...buildPatch(), dueDate: option.value });
    } else {
      setWorkingDate(option.value);
      onSave({ ...buildPatch(), workingDate: option.value });
    }
  }

  function selectProject(project: ProjectWithSpace) {
    setProjectId(project.id);
    onSave({ ...buildPatch(), projectId: project.id });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSave(buildPatch());
      return;
    }
    const itemCount =
      activeChip === 'project' ? filteredProjects.length : dateOptions.length;
    if (e.key === 'ArrowDown' && showDropdown) {
      e.preventDefault();
      setDropdownIndex((i) => Math.min(i + 1, itemCount - 1));
      return;
    }
    if (e.key === 'ArrowUp' && showDropdown) {
      e.preventDefault();
      setDropdownIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter' && showDropdown) {
      e.preventDefault();
      if (activeChip === 'project') {
        const project = filteredProjects[dropdownIndex];
        if (project) selectProject(project);
      } else {
        const option = dateOptions[dropdownIndex];
        if (option !== undefined) selectDateOption(option);
      }
    }
  }

  function handleChipClick(chip: EditField) {
    setActiveChip(chip);
    setDropdownIndex(0);
    setSearch('');
    inputRef.current?.focus();
  }

  const currentProject = projects.find((p) => p.id === projectId);
  const inputValue = activeChip === 'project' ? search : title;

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (activeChip === 'project') {
      setSearch(e.target.value);
      setDropdownIndex(0);
    } else {
      setTitle(e.target.value);
    }
  }

  const chipBase =
    'inline-flex items-center gap-1 px-2 py-0.5 border text-[11px] font-mono cursor-pointer';
  const chipIdle = 'border-border-2 text-muted hover:border-accent hover:text-accent';
  const chipActive = 'border-accent text-accent bg-accent/5';

  return (
    <div className="border-t border-border bg-surface shrink-0">
      {/* Context row */}
      <div className="flex items-center px-4 py-1 border-b border-border bg-surface-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-dim">
          Editing · {task.title}
        </span>
        <span className="ml-auto font-mono text-[9px] text-dim">
          esc to cancel · ⌘↩ to save
        </span>
      </div>

      {/* Input row */}
      <div className="flex items-center h-11 px-4 gap-3">
        <input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={activeChip === 'project' ? 'Filter projects…' : ''}
          className="flex-1 bg-transparent border-none outline-none text-sm text-text font-sans min-w-0"
        />
        <div className="w-px h-4 bg-border shrink-0" />
        <button
          type="button"
          onClick={() => handleChipClick('project')}
          className={`${chipBase} ${activeChip === 'project' ? chipActive : chipIdle}`}
        >
          {activeChip === 'project' ? (
            '@p'
          ) : currentProject ? (
            <>
              <span
                className="w-1.5 h-1.5 shrink-0"
                style={{ backgroundColor: currentProject.space.color }}
              />
              {currentProject.name}
            </>
          ) : (
            '@p —'
          )}
        </button>
        <button
          type="button"
          onClick={() => handleChipClick('dueDate')}
          className={`${chipBase} ${activeChip === 'dueDate' ? chipActive : chipIdle}`}
        >
          @d {dueDate ? formatDate(dueDate) : '—'}
        </button>
        <button
          type="button"
          onClick={() => handleChipClick('workingDate')}
          className={`${chipBase} ${activeChip === 'workingDate' ? chipActive : chipIdle}`}
        >
          @w {workingDate ? formatDate(workingDate) : '—'}
        </button>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="border-t border-border">
          {activeChip === 'project'
            ? filteredProjects.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectProject(p)}
                  className={`flex items-center gap-2 w-full px-4 py-2 text-sm text-left ${
                    i === dropdownIndex ? 'bg-accent/5 text-text' : 'text-text hover:bg-surface-2'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 shrink-0"
                    style={{ backgroundColor: p.space.color }}
                  />
                  {p.name}
                </button>
              ))
            : dateOptions.map((opt, i) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => selectDateOption(opt)}
                  className={`flex items-center w-full px-4 py-2 text-sm text-left ${
                    i === dropdownIndex ? 'bg-accent/5 text-text' : 'text-text hover:bg-surface-2'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
        </div>
      )}
    </div>
  );
}
