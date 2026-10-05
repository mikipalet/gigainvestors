import {expect,it} from 'vitest';
import {rank} from '../../lib/search/rank';

it('returns one company for the two Alphabet share classes',()=>{
 const hits=rank({investors:[],stocks:[{t:'GOOGL',n:'Alphabet Inc.',h:36},{t:'GOOG',n:'Alphabet Inc. CL C',h:34}]},'alphabet');
 expect(hits.filter(h=>h.kind==='stock')).toHaveLength(1);
});

import {buildCompanyIndex} from '../../lib/search/companies';
const holdings={investors:[{code:'BRK',person:'Warren Buffett',firm:'Berkshire Hathaway'},{code:'psc',person:'Bill Ackman',firm:'Pershing Square'},{code:'HA',person:'Bill Nygren',firm:'Oakmark'}],stocks:[
 {t:'AAPL',n:'Apple Inc.',h:22},{t:'AAPL-OLD',n:'Apple Inc.',h:1},
 {t:'GOOG',n:'Alphabet Inc. CL C',h:34},{t:'GOOGL',n:'Alphabet Inc.',h:36},
 {t:'BRK.A',n:'Berkshire Hathaway CL A',h:17},{t:'BRK.B',n:'Berkshire Hathaway CL B',h:26},
 {t:'KO',n:'Coca Cola Co.',h:9},{t:'PLXS',n:'Plexus Corp.',h:2},{t:'TM',n:'Toyota Motor ADR',h:2},
]};
const dossiers=[{id:'AAPL.US',n:'Apple Inc.',mc:4e12,h:22},{id:'GOOGL.US',n:'Alphabet Inc Class A',mc:3e12,h:36},{id:'BRK-B.US',n:'Berkshire Hathaway Inc',mc:1e12,h:26},{id:'KO.US',n:'The Coca-Cola Company',mc:1e11,h:9},{id:'PLX.PA',n:'PLUXEE NV',mc:1e9,h:0},{id:'7203.JP',n:'TOYOTA MOTOR CORPORATION',mc:1e11,h:0}];
const index=buildCompanyIndex(holdings,dossiers,{'GOOG.US':'GOOGL.US','BRK-A.US':'BRK-B.US','TM.US':'7203.JP'});
it.each([
 ['apple','AAPL'],['aapl','AAPL'],['AAPL.US','AAPL'],['APC.DE','AAPL'],['AAPL-OLD','AAPL'],
 ['google','GOOGL'],['goog','GOOGL'],['alphabet','GOOGL'],['berkshire','BRK-B'],['BRK.A','BRK-B'],['BRK.B','BRK-B'],
 ['coca','KO'],['ko','KO'],['plexus','PLXS'],['pluxee','PLX.PA'],['toyota','7203.JP'],['7203','7203.JP'],['TM','7203.JP'],
])('resolves %s to one canonical company %s',(q,t)=>{
 const companies=rank(index,q).filter(h=>h.kind==='stock');
 expect(companies).toHaveLength(1);expect(companies[0]).toMatchObject({ticker:t});
});
it.each([['buffett','BRK'],['ackman','psc'],['ha','HA']])('keeps investor query %s searchable',(q,code)=>expect(rank(index,q)[0]).toMatchObject({kind:'investor',code}));
it('keeps different Coca-Cola businesses and similar names separate',()=>{
 const result=buildCompanyIndex({investors:[],stocks:[{t:'KO',n:'Coca-Cola Company',h:9},{t:'KOF',n:'Coca-Cola FEMSA',h:3},{t:'PLXS',n:'Plexus',h:2},{t:'PLX.PA',n:'Pluxee',h:0}]});
 expect(result.stocks).toHaveLength(4);
});
it('ranks an exact alias above a large name-prefix match',()=>{
 const result=buildCompanyIndex({investors:[],stocks:[]},[{id:'KO.US',n:'The Coca-Cola Company',mc:1e6,h:0},{id:'KOG.OL',n:'Ko Group',mc:1e12,h:40}]);
 expect(rank(result,'ko')[0]).toMatchObject({ticker:'KO'});
});
it('uses the current company URL when only a historical -OLD holding exists',()=>{
 const result=buildCompanyIndex({investors:[],stocks:[{t:'EX-OLD',n:'Example',h:1}]});
 expect(rank(result,'EX-OLD')[0]).toMatchObject({ticker:'EX'});
 expect(rank(result,'EX')[0]).toMatchObject({ticker:'EX'});
});
it('merges preferred Petrobras ADRs with its published primary listing',()=>{
 const result=buildCompanyIndex({investors:[],stocks:[{t:'PBR.A',n:'Petroleo Brasil Sp Pref ADR',h:2},{t:'PBR',n:'Petroleo Brasileiro',h:3}]},[{id:'PETR3.SA',n:'Petroleo Brasileiro Petrobras SA ADR',h:0,mc:1e11}],{'PBR.US':'PETR3.SA'});
 expect(result.stocks).toHaveLength(1);
 expect(rank(result,'PBR.A')[0]).toMatchObject({ticker:'PETR3.SA'});
});
it('rejects known provider aliases between unrelated namesake businesses',()=>{
 const result=buildCompanyIndex({investors:[],stocks:[{t:'COMP',n:'Compass Inc.',h:2},{t:'AGX',n:'Argan Inc.',h:2},{t:'NNBR',n:'NN Inc.',h:1}]},[{id:'CPG.LSE',n:'Compass Group PLC',mc:1e10,h:0},{id:'ARG.PA',n:'Argan SA',mc:1e9,h:0},{id:'NN.AS',n:'NN Group NV',mc:1e10,h:0}],{'COMP.US':'CPG.LSE','AGX.US':'ARG.PA','NNBR.US':'NN.AS'});
 expect(result.stocks).toHaveLength(6);
 expect(rank(result,'COMP')[0]).toMatchObject({ticker:'COMP'});
});
it('finds a dossier by its native company name',()=>{
 const result=buildCompanyIndex({investors:[],stocks:[]},[{id:'7203.JP',n:'Toyota Motor Corporation',nameLocal:'トヨタ自動車',mc:1e11,h:0}]);
 expect(rank(result,'トヨタ')[0]).toMatchObject({ticker:'7203.JP'});
});

it('carries the canonical issuer logo into search hits and keeps namesakes separate',()=>{
 const logo='/api/value/logo?asset='+'a'.repeat(64);
 const result=buildCompanyIndex({investors:[],stocks:[{t:'EWBC',n:'East West Bancorp',h:1}]},[{id:'EWBC.US',n:'East West Bancorp',mc:1e10,h:1,lg:logo},{id:'EAST.US',n:'East Bancorp',mc:1e8,h:0,lg:null}]);
 expect(rank(result,'EWBC')[0]).toMatchObject({ticker:'EWBC',logo});
 expect(rank(result,'EAST')[0]).toMatchObject({ticker:'EAST',logo:null});
});
