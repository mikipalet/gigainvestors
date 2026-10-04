import {VALUE_PRODUCT_NAME} from '@/lib/value/brand';
import {pageAlternates} from '@/lib/agents/urls';
export const metadata={title:`${VALUE_PRODUCT_NAME} | GigaInvestors`,description:'Five business quality tests, price and expected annual return.',alternates:{canonical:pageAlternates('value','/').canonical}};
import {renderValuePage} from './ValueHome';
export const revalidate = 86400;
export default async function ValuePage() {
 return renderValuePage();
}
