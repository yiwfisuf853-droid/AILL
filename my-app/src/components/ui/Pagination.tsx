import { IconChevronLeft, IconChevronRight } from "@/components/ui/Icon";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, pageSize, total, onChange, className = '' }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div data-name="pagination" className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        data-name="paginationPrevBtn"
        className="rounded p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <IconChevronLeft size={16} />
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} data-name="paginationEllipsis" className="px-2 text-muted-foreground">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            data-name={`paginationPage${p}`}
            className={`min-w-[32px] h-8 rounded text-sm font-medium transition-colors ${
              page === p
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        data-name="paginationNextBtn"
        className="rounded p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <IconChevronRight size={16} />
      </button>
    </div>
  );
}
