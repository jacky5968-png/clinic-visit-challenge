import {describe,it,expect} from 'vitest';
import {layoutSceneSpeech} from '../src/three/layoutSceneSpeech';
describe('scene speech placement',()=>{
 it('keeps the expanded internal-medicine reminder clear of the representative and controls on landscape iPad',()=>{
  const viewport={width:907.1875,height:800},bubble={width:310,height:341};
  const obstacles=[
   {left:414.692993,top:234.868605,width:58.938342,height:122.376544},
   {left:580.807530,top:390.014518,width:60.915184,height:123.566788},
   {left:308.767628,top:280.054474,width:63.218163,height:124.226855},
   {left:653.978610,top:331.159279,width:68.276990,height:111.554002},
   {left:0,top:720,width:200,height:80},
  ];
  const p=layoutSceneSpeech({x:444.564163,y:234.772461},bubble,viewport,obstacles);
  for(const o of obstacles)expect(p.left+bubble.width<=o.left||p.left>=o.left+o.width||p.top+bubble.height<=o.top||p.top>=o.top+o.height).toBe(true);
  expect(p.left).toBeGreaterThanOrEqual(12);expect(p.top).toBeGreaterThanOrEqual(12);
  expect(p.left+bubble.width).toBeLessThanOrEqual(viewport.width-12);
  expect(p.top+bubble.height).toBeLessThanOrEqual(viewport.height-12);
 });
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
