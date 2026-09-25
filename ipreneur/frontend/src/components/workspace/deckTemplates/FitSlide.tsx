/**
 * A 1280x720 slide scaled to exactly fill whatever box it lands in.
 *
 * Measured rather than computed: these thumbnails sit in grid `1fr` tracks and
 * flex children whose real width isn't known up front, so any fixed scale
 * leaves the slide filling part of its box with dead space around it. Spans,
 * not divs, because thumbnails are often placed inside a <button>.
 */
import { useLayoutEffect, useRef, useState } from "react";

export function FitSlide({ render }: { render: () => React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [s, setS] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setS(el.clientWidth / 1280);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <span
      ref={ref}
      className="block"
      style={{ width: "100%", aspectRatio: "16 / 9", overflow: "hidden", position: "relative" }}
    >
      {s > 0 && (
        <span
          className="block"
          style={{ width: 1280, height: 720, transform: `scale(${s})`, transformOrigin: "top left" }}
        >
          {render()}
        </span>
      )}
    </span>
  );
}
