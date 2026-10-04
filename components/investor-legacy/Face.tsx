interface Props {
  slug: string;
  size: 320 | 1200;
  sizes?: string;
  priority?: boolean;
  className?: string;
}

const set = (slug: string, ext: string) => `/faces/v3/${slug}-320.${ext} 320w, /faces/v3/${slug}-1200.${ext} 1200w`;

export function Face({ slug, size, sizes, priority, className }: Props) {
  const s = sizes ?? `${size}px`;
  return (
    <picture className={`pointer-events-none block h-full w-full ${className ?? ""}`}>
      <source type="image/avif" srcSet={set(slug, "avif")} sizes={s} />
      <img
        src={`/faces/v3/${slug}-${size}.webp`}
        srcSet={set(slug, "webp")}
        sizes={s}
        alt=""
        loading="eager"
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        draggable={false}
        className="block h-full w-full object-contain object-bottom"
      />
    </picture>
  );
}
