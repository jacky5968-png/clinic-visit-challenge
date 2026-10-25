import {describe,it,expect} from 'vitest';
import {layoutSceneSpeech} from '../src/three/layoutSceneSpeech';
describe('scene speech placement',()=>{
 for(const viewport of [{width:280,height:680},{width:350,height:680},{width:970,height:600}]){
  it('keeps dialogue readable inside '+viewport.width+'px with faces clear',()=>{
   const bubble={width:Math.min(310,viewport.width-24),height:220};
   const faces=[{left:viewport.width*.48-22,top:viewport.height*.48,width:44,height:56},
     {left:viewport.width*.7-22,top:viewport.height*.58,width:44,height:56}];
   for(const anchor of [{x:viewport.width*.48,y:viewport.height*.48-28},{x:viewport.width*.7,y:viewport.height*.58-28}]){
    const p=layoutSceneSpeech(anchor,bubble,viewport,faces);
    expect(p.left).toBeGreaterThanOrEqual(12);expect(p.top).toBeGreaterThanOrEqual(12);
    expect(p.left+bubble.width).toBeLessThanOrEqual(viewport.width-12);
    expect(p.top+bubble.height).toBeLessThanOrEqual(viewport.height-12);
    for(const face of faces)expect(
     p.left+bubble.width<=face.left || p.left>=face.left+face.width ||
     p.top+bubble.height<=face.top || p.top>=face.top+face.height
    ).toBe(true);
    expect(p.tailX).toBeGreaterThanOrEqual(p.left);
    expect(p.tailX).toBeLessThanOrEqual(p.left+bubble.width);
   }
  });
 }
});
