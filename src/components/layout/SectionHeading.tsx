import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  title,
  description,
  href,
  hrefLabel = "ดูทั้งหมด",
  className,
}: {
  title: ReactNode;
  description?: string;
  href?: string;
  hrefLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-3xl">
        <h2 className="font-display text-2xl font-bold text-paper md:text-4xl">{title}</h2>
        {description && (
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-concrete md:text-base">{description}</p>
        )}
      </div>
      {href && (
        <Link
          to={href}
          className={cn(
            "clay-control group inline-flex w-fit shrink-0 items-center gap-2 border border-white bg-ink/85 px-4 py-2.5 text-sm font-semibold text-acid hover:bg-sage",
          )}
        >
          {hrefLabel}
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
