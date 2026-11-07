"use client";

import { useEffect, useRef, useState } from "react";
import { Arrows } from "./arrows";

type Props = {
  images: string[];
  /** The band's height, such as "h-[46dvh]". Each photo fills it at its own shape. */
  height: string;
};

/** Copies of the photos on each side, so the band loops: the last photo sits left of the first. */
const COPIES = 3;

/**
 * A white band of photos across the full width. Stores' photos come in different shapes, so each
 * keeps its own and they sit side by side. The one in the middle is bright and the rest are faded.
 * Tap a faded one, swipe, or use the arrows to bring it to the middle. It loops both ways.
 */
export function Gallery({ images, height }: Props) {
  const strip = useRef<HTMLDivElement>(null);
  const count = images.length;
  // Positions run across all the copies. The middle copy is the real one.
  const [index, setIndex] = useState(count);
  const current = useRef(count);
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);

  function center(at: number, smooth = true) {
    const element = strip.current;
    const item = element?.children[at] as HTMLElement | undefined;
    if (!element || !item) return;
    element.scrollTo({
      left: item.offsetLeft + item.offsetWidth / 2 - element.clientWidth / 2,
      behavior: smooth ? "smooth" : "instant",
    });
  }

  useEffect(() => {
    if (count > 1) center(count, false);
    return () => clearTimeout(settle.current);
  }, [count]);

  function update() {
    const element = strip.current;
    if (!element) return;
    const middle = element.scrollLeft + element.clientWidth / 2;
    let closest = current.current;
    let gap = Infinity;
    [...element.children].forEach((child, at) => {
      const item = child as HTMLElement;
      const distance = Math.abs(item.offsetLeft + item.offsetWidth / 2 - middle);
      if (distance < gap) {
        gap = distance;
        closest = at;
      }
    });
    current.current = closest;
    setIndex(closest);

    // Once scrolling stops in a copy, jump to the same photo in the middle copy. They look the
    // same, so the jump can't be seen, and there's always more to scroll either way.
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const at = current.current;
      if (at >= count && at < count * 2) return;
      const same = (at % count) + count;
      current.current = same;
      setIndex(same);
      center(same, false);
    }, 150);
  }

  if (count < 2) {
    return (
      <div className={`flex justify-center bg-white ${height}`}>
        {/* Images come from many stores, so next/image can't list their hosts. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[0]} alt="" referrerPolicy="no-referrer" className="h-full w-auto max-w-full object-contain" />
      </div>
    );
  }

  const photo = index % count;
  const looped = Array.from({ length: COPIES }, (_, copy) => images.map((src) => ({ src, copy }))).flat();

  return (
    <div className="relative bg-white">
      <Arrows always label="photo" canBack canNext onBack={() => center(index - 1)} onNext={() => center(index + 1)} />
      <div
        ref={strip}
        role="region"
        aria-label={`Photo ${photo + 1} of ${count}`}
        className={`no-scrollbar flex snap-x snap-mandatory gap-1 overflow-x-auto ${height}`}
        onScroll={update}
      >
        {looped.map(({ src, copy }, at) => {
          // Only the middle copy is offered to screen readers and the keyboard.
          const real = copy === 1;
          return (
            <button
              key={`${copy}-${src}`}
              type="button"
              tabIndex={real ? 0 : -1}
              aria-hidden={real ? undefined : true}
              aria-label={real ? `Photo ${(at % count) + 1} of ${count}` : undefined}
              aria-current={real && at === index}
              className="h-full shrink-0 snap-center"
              onClick={() => center(at)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                referrerPolicy="no-referrer"
                className={`h-full w-auto max-w-[85vw] object-contain transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${at === index ? "" : "opacity-35"}`}
                // Widths are only known once photos load, so keep the current one in the middle.
                onLoad={() => center(current.current, false)}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
