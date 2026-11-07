"use client";

import { useRef, useState } from "react";

type Props = {
  images: string[];
  /** Sizing and background for each photo, such as "aspect-square bg-white". */
  className: string;
};

/** A product's photos: swipe through them, or tap a dot. One photo shows on its own. */
export function Photos({ images, className }: Props) {
  const strip = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (images.length < 2) {
    return (
      // Images come from many stores, so next/image can't list their hosts.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={images[0]} alt="" referrerPolicy="no-referrer" className={`w-full rounded-2xl object-contain ${className}`} />
    );
  }

  function show(next: number) {
    const element = strip.current;
    element?.scrollTo({ left: next * element.clientWidth, behavior: "smooth" });
  }

  return (
    <div>
      <div
        ref={strip}
        role="region"
        aria-label={`${images.length} photos. Swipe to see more.`}
        tabIndex={0}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-2xl"
        onScroll={(event) => {
          const { scrollLeft, clientWidth } = event.currentTarget;
          setIndex(Math.round(scrollLeft / clientWidth));
        }}
      >
        {images.map((src) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className={`w-full shrink-0 snap-center object-contain ${className}`}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-center">
        {images.map((src, dot) => (
          <button
            key={src}
            type="button"
            className="flex size-6 items-center justify-center"
            aria-label={`Photo ${dot + 1} of ${images.length}`}
            aria-current={dot === index}
            onClick={() => show(dot)}
          >
            <span className={`size-2 rounded-full ${dot === index ? "bg-ink" : "bg-line"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
