import {METHOD_RULE_COPY} from '@/lib/value/method-content';
import {metricLabels,formatMetric} from '@/lib/value/metric-labels';
import {metricHelp} from '@/lib/value/metric-help';

// Keep the row label short; the complete definition stays in its value column.
const ruleNames:Record<string,string>={
 returnFloorMedian:'Median return floor',returnFloorSecondLowest:'Low return floor',
 bookReturnCagr:'Book return / yr',shareCagrExCrisis:'Shares ex. crisis / yr',
 perShareValueGrowth:'Value growth / share',perShareValueChange:'Value change / share',
 historyYears:'Financial history',revenueDeclines:'Sales decline years',lossYears:'Loss years',
 opMarginCv:'Margin variation',roicMedian:'Median ROIC',roicSecondLowest:'Second-lowest ROIC',
 roeMedian:'Median ROTE',roeSecondLowest:'Second-lowest ROTE',grossMarginDrop:'Gross-margin decline',
 oeToNi:'Cash / profit',roiic:'New capital return',shareCagr:'Share growth / yr',
 nonAcquisitionShareCagr:'10y ordinary dilution',nonAcquisitionShareCagr5:'5y ordinary dilution',
 accruals:'Sloan accruals',dsri:'Receivables / sales',redFlags:'Accounting flags',
 restructuringYears:'Restructuring years',sbcToOcf:'Stock pay / cash flow',
 marginOfSafety:'Safety discount',mos:'Safety discount',
};
export function MethodRules(){
 return <section className="method-rules"><h3>Every numerical cutoff</h3><p>{METHOD_RULE_COPY[0]}</p><dl>{Object.entries(metricLabels).filter(([,m])=>m.threshold!==undefined&&m.better).map(([id,m])=>{
  const help=metricHelp(id,m.label);
  return <div key={id}><dt>{ruleNames[id]??m.label}</dt><dd>
   <strong>{m.better==='higher'?m.strict?'>':'≥':m.strict?'<':'≤'} {formatMetric({value:m.threshold!,format:m.format})}</strong>
   <p>{help.label}{help.label!==m.label&&<small>{m.label}</small>}</p><p>{help.why}</p>
  </dd></div>;
 })}</dl><p>{METHOD_RULE_COPY[1]}</p></section>;
}
