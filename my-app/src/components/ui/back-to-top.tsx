import { memo, useEffect, useState } from 'react';
import { IconChevronLeft } from "@/components/ui/icon";

export const BackToTop = memo(function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShow(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      data-name="backToTopBtn"
      className="fixed bottom-6 right-6 z-40 p-2.5 rounded-full bg-card border border-border shadow-lg text-muted-foreground hover:text-foreground hover:border-primary transition-all duration-200"
      style={{
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(16px)',
        pointerEvents: show ? 'auto' : 'none',
      }}
      aria-label="返回顶部"
    >
      <IconChevronLeft size={20} />
    </button>
  );
});
