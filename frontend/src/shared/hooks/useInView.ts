import { useEffect, useRef, useState } from "react";

// Latches true once the element first scrolls near the viewport, then stops observing.
// Used to defer rendering heavy content (e.g. part thumbnails) until it is actually needed.
export function useInView<T extends Element>(): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "250px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView]);

  return [ref, inView];
}
