import type { LabelObstacle } from './layoutSceneLabels';
export function layoutSceneSpeech(anchor:{x:number;y:number},bubble:{width:number;height:number},
  viewport:{width:number;height:number},avoid:LabelObstacle[]){
  const margin=12,gap=12;
  const maxX=Math.max(margin,viewport.width-bubble.width-margin);
  const maxY=Math.max(margin,viewport.height-bubble.height-margin);
  const clamp=(n:number,max:number)=>Math.max(margin,Math.min(n,max));
  const ideal={left:clamp(anchor.x-bubble.width/2,maxX),top:clamp(anchor.y-bubble.height-36,maxY)};
  // Include obstacle side edges: expanded reminders can fit beside the lower controls
  // even when every anchor/viewport-edge candidate overlaps a person's silhouette.
  const xs=[...new Set([ideal.left,margin,maxX,clamp(anchor.x+36,maxX),clamp(anchor.x-bubble.width-36,maxX),
    ...avoid.flatMap(p=>[clamp(p.left-bubble.width-gap,maxX),clamp(p.left+p.width+gap,maxX)])])];
  const ys=[ideal.top,margin,maxY,clamp(anchor.y+36,maxY),...avoid.flatMap(p=>[
    clamp(p.top-bubble.height-gap,maxY),clamp(p.top+p.height+gap,maxY)])];
  const overlap=(left:number,top:number,p:LabelObstacle)=>
    Math.max(0,Math.min(left+bubble.width+gap,p.left+p.width)-Math.max(left-gap,p.left))*
    Math.max(0,Math.min(top+bubble.height+gap,p.top+p.height)-Math.max(top-gap,p.top));
  const candidates=xs.flatMap(left=>ys.map(top=>({left,top}))).map(p=>({
    ...p,score:avoid.reduce((n,o)=>n+overlap(p.left,p.top,o),0)*10000+
      (p.left-ideal.left)**2+(p.top-ideal.top)**2
  })).sort((a,b)=>a.score-b.score);
  const best=candidates[0];
  return {...best,
    tailX:Math.max(best.left+12,Math.min(anchor.x,best.left+bubble.width-12)),
    tailY:Math.max(best.top+12,Math.min(anchor.y,best.top+bubble.height-12))};
}
