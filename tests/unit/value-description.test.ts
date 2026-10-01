import {describe,it,expect} from 'vitest';
import {descriptionSentence} from '../../components/value/description';
describe('complete description sentences',()=>{
 it('prefers the full source over truncated cached text',()=>expect(descriptionSentence('Wolters Kluwer N.V. provides software for professionals. It operates globally.','Wolters Kluwer N.V. provides…')).toBe('Wolters Kluwer N.V. provides software for professionals. It operates globally.'));
 it('shortens at a grammatical adjunct boundary',()=>expect(descriptionSentence('Example provides software and services for professionals in the '+ 'international healthcare sector '.repeat(12)+'.')).toBe('Example provides software and services for professionals.'));
});

it('preserves the main verb after a subsidiary clause',()=>{
 expect(descriptionSentence('Taiwan Semiconductor Manufacturing Company Limited, together with its subsidiaries, manufactures, packages, tests, and sells integrated circuits and other semiconductor devices in Taiwan, China, Europe, the Middle East, Africa, Japan, the United States, and internationally.')).toBe('Taiwan Semiconductor Manufacturing Company Limited manufactures, packages, tests, and sells integrated circuits and other semiconductor devices.');
});
