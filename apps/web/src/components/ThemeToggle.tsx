import type { ThemePreference } from "../lib/theme";

interface ThemeToggleProps {
  preference: ThemePreference;
  onChange: (pref: ThemePreference) => void;
}

const OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

export function ThemeToggle({ preference, onChange }: ThemeToggleProps) {
  return (
    <div className="theme-toggle" role="group" aria-label="Color theme">
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={`theme-toggle__btn ${preference === opt.id ? "theme-toggle__btn--active" : ""}`}
          onClick={() => onChange(opt.id)}
          aria-pressed={preference === opt.id}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
