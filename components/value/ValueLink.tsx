'use client';
import type {ComponentProps} from 'react';
import {QuarterLink} from '@/components/QuarterLink';
import {valueHref} from '@/lib/value/href';
export function ValueLink({href,...props}:Omit<ComponentProps<'a'>,'href'>&{href:string}){return <QuarterLink {...props} href={valueHref(href)}/>;}
