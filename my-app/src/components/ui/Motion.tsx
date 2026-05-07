import { useEffect, useRef, useState, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  duration?: number;
  className?: string;
}

export function Reveal({ children, delay = 0, direction = 'up', duration = 400, className = '' }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const transforms: Record<string, string> = {
    up: 'translateY(16px)',
    down: 'translateY(-16px)',
    left: 'translateX(16px)',
    right: 'translateX(-16px)',
    none: 'none',
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : transforms[direction],
        transition: `opacity ${duration}ms ease-out ${delay}ms, transform ${duration}ms ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

interface StaggerProps {
  children: ReactNode[] | ReactNode;
  staggerMs?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  className?: string;
}

export function Stagger({ children, staggerMs = 60, direction = 'up', className = '' }: StaggerProps) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <>
      {items.map((child, i) => (
        <Reveal key={i} delay={i * staggerMs} direction={direction} className={className}>
          {child}
        </Reveal>
      ))}
    </>
  );
}

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  return (
    <div
      className={className}
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'none' : 'translateY(8px)',
        transition: 'opacity 300ms ease-out, transform 300ms ease-out',
      }}
    >
      {children}
    </div>
  );
}

interface CountUpProps {
  target: number;
  duration?: number;
  className?: string;
}

export function CountUp({ target, duration = 800, className = '' }: CountUpProps) {
  const [current, setCurrent] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = performance.now();
          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCurrent(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref} className={className}>{current.toLocaleString()}</span>;
}
