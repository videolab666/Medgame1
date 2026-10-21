import test from 'node:test';
import assert from 'node:assert/strict';
import {STORY,beforeLocation,afterRound,pagesCollected} from '../src/core/story.js';
import {LOCATION_ORDER,CONFIG} from '../src/core/config.js';
import {createProgress,memoryStorage} from '../src/core/progress.js';
test('ten lives',()=>assert.equal(CONFIG.MAX_LIVES,10));
test('initial welcome and local introduction',()=>{
 const p=createProgress(memoryStorage());
 assert.deepEqual(beforeLocation(p.state,'hands'),['welcome','intro:hands']);
 assert.deepEqual(afterRound(p.state,'hands'),[]);
});
test('seen scenes survive reload and reset',()=>{
 const store=memoryStorage(); let p=createProgress(store);
 p.markStorySeen('welcome'); p=createProgress(store);
 assert.equal(p.hasSeenStory('welcome'),true);
 assert.deepEqual(beforeLocation(p.state,'hands'),['intro:hands']);
 p.reset(); assert.equal(p.hasSeenStory('welcome'),false);
});
test('all six chapters and finale',()=>{
 const p=createProgress(memoryStorage());
 for(const loc of LOCATION_ORDER){p.state.rounds[loc]=3;assert.ok(afterRound(p.state,loc).includes('chapter:'+loc));p.markStorySeen('chapter:'+loc);}
 assert.equal(pagesCollected(p.state),6);
 assert.deepEqual(afterRound(p.state,'skin'),['finale']);
 p.markStorySeen('finale');assert.deepEqual(afterRound(p.state,'skin'),[]);
});
test('all scenes have dialogue',()=>{
 assert.equal(Object.keys(STORY).length,14);
 for(const s of Object.values(STORY)){assert.ok(s.title&&s.pages.length);for(const p of s.pages){assert.ok(['yuliya','bilyk'].includes(p.actor));assert.ok(p.text.length>6);}}
});