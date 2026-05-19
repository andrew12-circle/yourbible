import * as React from "react";

/** Phones and tablet portrait: one page at a time. Spread from 900px up. */
export const READER_SINGLE_PAGE_MAX = 900;

export function useReaderSinglePage() {
  const [singlePage, setSinglePage] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${READER_SINGLE_PAGE_MAX - 1}px)`);
    const onChange = () => {
      setSinglePage(window.innerWidth < READER_SINGLE_PAGE_MAX);
    };
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!singlePage;
}
