"use client";
import { useState } from "react";

export default function SafeImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [current, setCurrent] = useState(src || "/placeholder.svg");
  return (
    <img
      src={current}
      alt={alt}
      className={className}
      onError={() => {
        if (current !== "/placeholder.svg") setCurrent("/placeholder.svg");
      }}
    />
  );
}