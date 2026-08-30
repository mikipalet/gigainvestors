interface Props {
  slug: string;
  size: 320 | 1200;
  priority?: boolean;
  className?: string;
}

export function Face({ slug, size, priority, className }: Props) {
  return (
    <picture className={`pointer-events-none block h-full w-full ${className ?? ""}`}>
      <source type="image/avif" srcSet={`/faces/${slug}-${size}.avif`} />
      <img
        src={`/faces/${slug}-${size}.webp`}
        alt=""
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        className="block h-full w-full object-contain object-bottom"
      />
    </picture>
  );
}
