import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext<{ theme: string; toggleTheme: Function }>({
  theme: "light",
  toggleTheme: (theme: string) => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: any }) => {
  const [theme, setTheme] = useState("light");

  const toggleTheme = (theme: string) => {
    setTheme(theme);
  };

  async function initTheme() {
    let data = await browser.storage.local.get("theme");
    if (data.theme && typeof data.theme === "string") {
      setTheme(data.theme);
    }
  }

  useEffect(() => {
    initTheme();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
