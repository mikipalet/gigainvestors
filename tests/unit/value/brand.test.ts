import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { VALUE_PRODUCT_NAME, VALUE_PRODUCT_DESCRIPTION } from '@/lib/value/brand';
import { MetricHelp } from '@/components/value/MetricHelp';
import { MethodRules } from '@/components/value/MethodRules';

it('names the product and describes five quality tests plus a separate price check', () => {
  expect(VALUE_PRODUCT_NAME).toBe('GigaValue');
  expect(VALUE_PRODUCT_DESCRIPTION).toBe(`${VALUE_PRODUCT_NAME}: five quality tests plus a price check, with financial history and report evidence.`);
});
it('uses neutral metric labels while retaining honest method attribution', () => {
  const metric = renderToStaticMarkup(createElement(MetricHelp, { id: 'retainedDollar', technical: 'Retained earnings' }));
  expect(metric).toContain('Why it matters:');
  expect(metric).not.toContain('Why Buffett cares');
  const method = renderToStaticMarkup(createElement(MethodRules));
  expect(method).toContain(`${VALUE_PRODUCT_NAME}’s model choices`);
  expect(method).toContain('principles Buffett and Munger describe');
  expect(method).toContain('not an endorsement');
  expect(method).not.toContain('Buffett’s bar');
});
