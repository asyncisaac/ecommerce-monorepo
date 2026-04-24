"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

function normalizeSrc(src?: string | null) {
  if (!src) return "/placeholder.svg";
  if (src.includes("via.placeholder.com")) return "/placeholder.svg";
  return src;
}

export default function SafeImage({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  const normalized = useMemo(() => normalizeSrc(src), [src]);
  const [current, setCurrent] = useState(normalized);

  useEffect(() => {
    setCurrent(normalized);
  }, [normalized]);

  return (
    <span className={`relative block ${className ?? ""}`}>
      <Image
        src={current}
        alt={alt}
        fill
        sizes="100vw"
        unoptimized
        className="object-cover"
        onError={() => {
          if (current !== "/placeholder.svg") setCurrent("/placeholder.svg");
        }}
      />
    </span>
  );
}
