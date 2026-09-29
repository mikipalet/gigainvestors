import { T } from '@/lib/value/config';
export function MarginBar({ value, requiredMos = T.price.requiredMos.stable, maximum = 4, minimum = .25, buy = false }: { buy?:boolean; value: number; requiredMos?: number; maximum?: number; minimum?: number }) {
  const ratio = 1 - value;
  const position = (v: number) => (Math.log2(Math.max(minimum, v)) - Math.log2(minimum)) / (Math.log2(maximum) - Math.log2(minimum)) * 100;
  return <span className="ratio-cell"><span className="ratio-track" aria-hidden="true"><i className="ratio-buy" style={{width:`${position(1-requiredMos)}%`}}/><i className="ratio-tick" style={{left:`${position(1-requiredMos)}%`}}/><i className="ratio-dot" style={{left:`${position(ratio)}%`}}/></span><strong className={buy ? 'text-buy' : ''}>{ratio.toFixed(2)}×</strong></span>;
}
