'use client';
import { useSyncExternalStore, type ComponentProps } from 'react';
import { usePathname } from 'next/navigation';
import { valueHref } from '@/lib/value/href';
const subscribe = () => () => {};
export function ValueLink({ href, ...props }: Omit<ComponentProps<'a'>, 'href'> & { href: string }) {
  usePathname();
  const pathname = useSyncExternalStore(subscribe, () => window.location.pathname, () => '');
  return <a {...props} href={valueHref(href, pathname)} />;
}
