export type Sort = 'name' | 'country' | 'cap' | 'mos' | 'holders' | 'return' | 'flags';
export const columns: Array<[Sort,string]> = [['name','Company'],['cap','Market cap'],['mos','Price vs estimated value'],['flags','Verdict'],['return','Return on invested money']];
