import { useEffect, useId, useRef, useState } from "react";

type FilterSelectOption<T extends string> = { value: T; label: string };

export default function FilterSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: FilterSelectOption<T>[];
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const selected = options.find((item) => item.value === value) ?? options[0];

  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  };

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  const move = (direction: number) => {
    const index = options.findIndex((item) => item.value === value);
    onChange(options[(index + direction + options.length) % options.length].value);
  };

  return (
    <div className="filter-select" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="filter-sort filter-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            move(1);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            move(-1);
          } else if (event.key === "Escape" && open) {
            close();
          }
        }}
      >
        <span className="filter-select-label">{selected.label}</span>
        <span className="filter-select-icon" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div id={id} className="filter-select-menu" role="listbox" aria-label="排序方式">
          {options.map((option) => (
            <button
              type="button"
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                close();
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") close();
                else if (event.key === "ArrowDown") {
                  event.preventDefault();
                  move(1);
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  move(-1);
                } else if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onChange(option.value);
                  close();
                }
              }}
            >
              <span>{option.label}</span>
              {option.value === value && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
