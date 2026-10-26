import React, { createContext, useContext, useState } from 'react';
import PropTypes from 'prop-types';

const ThemeContext = createContext({ theme: 'light', toggle: () => {} });

export function ThemeProvider({ children, initialTheme }) {
  const [theme, setTheme] = useState(initialTheme);
  const toggle = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));
  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
  initialTheme: PropTypes.oneOf(['light', 'dark']),
};

ThemeProvider.defaultProps = {
  initialTheme: 'light',
};

export const useTheme = () => useContext(ThemeContext);
