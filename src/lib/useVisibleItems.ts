import { useEffect, useState } from "react";

export function useVisibleItems<T>(items: readonly T[], pageSize: number, resetKey: string) {
  const [limit, setLimit] = useState(pageSize);

  useEffect(() => {
    setLimit(pageSize);
  }, [pageSize, resetKey]);

  const visibleItems = items.slice(0, limit);
  const remaining = Math.max(0, items.length - visibleItems.length);
  const showMore = () => setLimit((current) => Math.min(items.length, current + pageSize));

  return { visibleItems, remaining, showMore };
}
