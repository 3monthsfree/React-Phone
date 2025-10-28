import { Moon, Sun } from "lucide-react";
import { useDarkMode } from "../hooks/use-dark-mode";

export function ThemeToggle() {
  const { toggle } = useDarkMode({
    defaultValue: true,
    localStorageKey: "react-phone-theme",
  });

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg border border-black dark:border-white hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors relative inline-flex items-center justify-center"
      aria-label="Toggle theme"
    >
      <Sun className="h-5 w-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90 text-black" />
      <Moon className="absolute h-5 w-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0 text-white" />
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
