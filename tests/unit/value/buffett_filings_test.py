"""Run with: python3 tests/unit/value/buffett_filings_test.py"""
import importlib.util
import pathlib
import unittest
spec=importlib.util.spec_from_file_location('filings',pathlib.Path(__file__).parents[3]/'scripts/value/buffett-filings.py')
filings=importlib.util.module_from_spec(spec);spec.loader.exec_module(filings)

class FilingParserTest(unittest.TestCase):
    def test_legacy_manager_rows_include_wrapped_issuer_name(self):
        rows=filings.parse('''
Wells Fargo &     Com   949746 10 1      755,705   12,902,590            X  1
   Co. Del                                59,835    1,021,600            X  2
                                         497,146    8,488,070            X  3
        ''')
        self.assertEqual(len(rows),3)
        self.assertEqual({r['cusip'] for r in rows},{'949746101'})
        self.assertEqual(sum(r['shares'] for r in rows),22412260)
    def test_xml_namespaces_and_options_are_preserved(self):
        rows=filings.parse('''<XML><informationTable xmlns="urn:sec"><infoTable>
        <nameOfIssuer>APPLE INC</nameOfIssuer><titleOfClass>COM</titleOfClass><cusip>037833100</cusip>
        <value>1000</value><shrsOrPrnAmt><sshPrnamt>20</sshPrnamt><sshPrnamtType>SH</sshPrnamtType></shrsOrPrnAmt>
        <putCall>PUT</putCall></infoTable></informationTable></XML>''')
        self.assertEqual(rows[0]['shares'],20)
        self.assertEqual(rows[0]['putCall'],'PUT')
        self.assertEqual(rows[0]['cusip'],'037833100')

if __name__=='__main__':unittest.main()
