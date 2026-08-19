import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const pages = Array.from(
    { length: totalPages },
    (_, index) => index + 1,
  ).filter(
    (item) => item === 1 || item === totalPages || Math.abs(item - page) <= 1,
  );

  return (
    <nav className="flex items-center gap-1" aria-label="Phân trang">
      <Button
        variant="outline"
        size="sm"
        className="!h-8 !w-8 !rounded-lg px-0"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Trang trước"
      >
        <ChevronLeft className="!h-5 !w-5 !shrink-0" strokeWidth={2.5} />
      </Button>
      {pages.map((item, index) => {
        const previous = pages[index - 1];
        return (
          <span key={item} className="contents">
            {previous && item - previous > 1 ? (
              <span className="px-1 text-slate-400">…</span>
            ) : null}
            <Button
              variant={item === page ? "primary" : "outline"}
              size="sm"
              className="!h-8 !w-8 !rounded-lg px-0"
              onClick={() => onChange(item)}
              aria-current={item === page ? "page" : undefined}
            >
              {item}
            </Button>
          </span>
        );
      })}
      <Button
        variant="outline"
        size="sm"
        className="!h-8 !w-8 !rounded-lg px-0"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Trang sau"
      >
        <ChevronRight className="!h-5 !w-5 !shrink-0" strokeWidth={2.5} />
      </Button>
    </nav>
  );
}
