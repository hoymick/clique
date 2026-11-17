import test from 'node:test';
import assert from 'node:assert/strict';
import {appendActivity,readActivity,readWatch,watchKey,toggleWatch,routeFromUrl,marketLink} from '../src/journal.mjs';
const storage = new Map(); const local = {getItem:k=>storage.get(k)};
test('shared links preserve explicit network and reject malformed vault addresses',()=>{
 const id='11111111111111111111111111111111';
 for(const mode of ['devnet','mainnet']) assert.deepEqual(routeFromUrl(marketLink('https://clique.example',mode,id)),{mode,vault:id,error:''});
 assert.equal(routeFromUrl('https://clique.example/?mode=mainnet&vault=sample-sol').vault,null);
 assert.equal(routeFromUrl('https://clique.example/?vault=%3Cscript%3E').vault,null);
 assert.equal(routeFromUrl('https://clique.example/?mode=demo&vault=sample-sol').vault,'sample-sol');
});
test('watchlists remain isolated by network and tolerate corrupt storage',()=>{
 storage.set(watchKey('demo'),'["sample-sol"]');storage.set(watchKey('mainnet'),'{broken');
 assert.deepEqual(readWatch(local,'demo'),['sample-sol']); assert.deepEqual(readWatch(local,'mainnet'),[]);assert.deepEqual(readWatch(local,'devnet'),[]);
 assert.deepEqual(toggleWatch(['x'],'x'),[]);assert.equal(toggleWatch(Array.from({length:100},(_,i)=>String(i)),'new').length,100);
});
test('onchain activity requires a receipt, deduplicates signatures and retains network identity',()=>{
 const item={mode:'devnet',wallet:'alice',marketId:'vault',title:'Question',action:'Committed',at:1};
 assert.throws(()=>appendActivity([],item));
 const rows=appendActivity([],{...item,signature:'sig'});assert.equal(appendActivity(rows,{...item,signature:'sig'}).length,1);
 assert.equal(appendActivity(rows,{...item,mode:'mainnet',signature:'sig'}).length,2);
 const demo=appendActivity(rows,{...item,mode:'demo'});storage.set('clique-activity-v1',JSON.stringify(demo));assert.deepEqual(readActivity(local),demo);
});
