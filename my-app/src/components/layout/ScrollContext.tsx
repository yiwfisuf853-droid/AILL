import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';

interface ScrollContextType {
  scrollRatio: number;
  isScrolled: boolean;
}

const ScrollContext = createContext<ScrollContextType>({ scrollRatio: 0, isScrolled: false });

export function ScrollProvider({ children }: { children: ReactNode }) {
  const [scrollRatio, setScrollRatio] = useState(0);
  const rafRef = useRef<number>(undefined);

  useEffect(() => {
    const el = document.querySelector('.layout-center');
    if (!el) return;

    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const scrollTop = el.scrollTop;
        const scrollHeight = el.scrollHeight - el.clientHeight;
        const ratio = scrollHeight > 0 ? Math.min(scrollTop / scrollHeight, 1) : 0;
        setScrollRatio(ratio);
      });
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const isScrolled = scrollRatio > 0.05;

  return (
    <ScrollContext.Provider value={{ scrollRatio, isScrolled }}>
      {children}
    </ScrollContext.Provider>
  );
}

export function useScroll() {
  return useContext(ScrollContext);
}
