import { useState } from "react";
import React from "react";

interface CarouselProps {
  title?: string;
  direction: "left" | "right";
  children: React.ReactNode;
}

export function Carousel({ title, direction, children }: CarouselProps) {
  const [isPaused, setIsPaused] = useState(false);
  const animationClass = direction === "left" ? "animate-scroll-left" : "animate-scroll-right";

  // Clone children with new keys for the duplicate row to avoid key conflicts
  const items = React.Children.toArray(children);
  const duplicate = items.map((child, i) =>
    React.isValidElement(child)
      ? React.cloneElement(child, { key: `dup-${i}` })
      : child
  );

  return (
    <div className="space-y-3">
      {title && <h3 className="text-lg font-medium text-white ml-2">{title}</h3>}
      <div
        className="overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <style>{`
          @keyframes scroll-left {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          @keyframes scroll-right {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(0); }
          }
          .animate-scroll-left { animation: scroll-left 40s linear infinite; }
          .animate-scroll-right { animation: scroll-right 40s linear infinite; }
          .paused { animation-play-state: paused !important; }
        `}</style>
        <div className={`flex gap-4 pb-2 ${animationClass} ${isPaused ? "paused" : ""}`}>
          <div className="flex gap-4 flex-shrink-0">{items}</div>
          <div className="flex gap-4 flex-shrink-0">{duplicate}</div>
        </div>
      </div>
    </div>
  );
}
