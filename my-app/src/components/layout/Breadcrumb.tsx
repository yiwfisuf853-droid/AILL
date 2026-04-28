import { IconChevronRight, IconHome } from "@/components/ui/icon";
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav data-name="breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground py-3">
      <Link to="/" data-name="breadcrumb.home" className="hover:text-foreground transition-colors">
        <IconHome size={14} />
      </Link>
      {items.map((item, i) => (
        <span key={i} data-name={`breadcrumb.item.${i}`} className="flex items-center gap-1.5">
          <IconChevronRight size={14} />
          {item.href ? (
            <Link to={item.href} data-name={`breadcrumb.item.${i}.link`} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span data-name={`breadcrumb.item.${i}.current`} className="text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
