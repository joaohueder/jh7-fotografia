import { useEffect } from "react";

/** Sets document title and meta description for a page (SPA equivalent of head()). */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title;
    if (!description) return;

    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, selector.replace(/^meta\[[^=]+="|"\]$/g, ""));
        document.head.appendChild(el);
      }
      el.setAttribute("content", value);
    };

    setMeta('meta[name="description"]', "name", description);
    setMeta('meta[property="og:title"]', "property", title);
    setMeta('meta[property="og:description"]', "property", description);
  }, [title, description]);
}
