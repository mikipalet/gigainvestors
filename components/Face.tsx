import Image from 'next/image';
interface Props {
  slug: string;
  size: 320 | 1200;
  sizes?: string;
  priority?: boolean;
  className?: string;
}
/** Serve the portrait at its actual tile width; image derivatives stay in Next's cache. */
export function Face({slug,size,sizes,priority,className}:Props){
 return <span className={`pointer-events-none relative block h-full w-full ${className??''}`}><Image src={`/faces/v3/${slug}-${size}.webp`} fill sizes={sizes??`${size}px`} alt="" loading="eager" fetchPriority={priority?'high':'auto'} quality={size===320?45:60} draggable={false} className="object-contain object-bottom"/></span>;
}
