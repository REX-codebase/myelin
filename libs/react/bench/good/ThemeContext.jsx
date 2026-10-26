import { createContext, use, useContext, useState } from 'react';

const ThemeContext = createContext({ theme: 'light', toggle: () => {} });

export function ThemeProvider({ children, initialTheme = 'light' }) {
  const [theme, setTheme] = useState(initialTheme);
  const toggle = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));
  return <ThemeContext value={{ theme, toggle }}>{children}</ThemeContext>;
}

export const useTheme = () => useContext(ThemeContext);

export function Heading({ children }) {
  if (children == null) return null;
  const { theme } = use(ThemeContext);
  return <h1 className={`heading-${theme}`}>{children}</h1>;
}
