export interface IslandLabel {id:string;x:number;y:number;width:number;height:number;}
export function placeIslandLabels(labels:IslandLabel[],width:number,height:number,avoid:IslandLabel[]=[]):IslandLabel[]{
 const result=labels.map(p=>({...p}));
 const clamp=(p:IslandLabel)=>{p.x=Math.max(8,Math.min(width-p.width-8,p.x));p.y=Math.max(8,Math.min(height-p.height-8,p.y));};
 for(const p of result)clamp(p);
 for(let pass=0;pass<35;pass++){
  let changed=false;
  for(let i=0;i<result.length;i++)for(let j=i+1;j<result.length;j++){
   const a=result[i],b=result[j];
   const ox=Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)+8;
   const oy=Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)+8;
   if(ox<=0||oy<=0)continue;
   const vertical=oy<ox;
   if(vertical){const direction=a.y<=b.y?-1:1;a.y+=direction*oy*.5;b.y-=direction*oy*.5;}
   else{const direction=a.x<=b.x?-1:1;a.x+=direction*ox*.5;b.x-=direction*ox*.5;}
   clamp(a);clamp(b);changed=true;
  }
  for(const a of result)for(const b of avoid){
   const ox=Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)+7;
   const oy=Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)+7;
   if(ox<=0||oy<=0)continue;
   const choices=[{x:a.x,y:b.y-a.height-7},{x:a.x,y:b.y+b.height+7},{x:b.x-a.width-7,y:a.y},{x:b.x+b.width+7,y:a.y}]
    .filter(p=>p.x>=8&&p.y>=8&&p.x+a.width<=width-8&&p.y+a.height<=height-8)
    .sort((p,q)=>Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(q.x-a.x,q.y-a.y));
   if(choices[0]){a.x=choices[0].x;a.y=choices[0].y;changed=true;}
  }
  if(!changed)break;
 }
 return result;
}

export interface IslandCallout extends IslandLabel {minX?:number;maxX?:number;minY?:number;maxY?:number;}
export function islandLabelsFit(labels:IslandCallout[],width:number,height:number,avoid:IslandLabel[]){
 const overlap=(a:IslandLabel,b:IslandLabel,gap=5)=>Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>-gap&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>-gap;
 return labels.every((a,i)=>a.x>=Math.max(7.5,a.minX??0)-.5&&a.x<=Math.min(width-a.width-7.5,a.maxX??width)+.5&&a.y>=Math.max(7.5,a.minY??0)-.5&&a.y<=Math.min(height-a.height-7.5,a.maxY??height)+.5&&a.x+a.width<=width-7.5&&!avoid.some(b=>overlap(a,b))&&!labels.slice(i+1).some(b=>overlap(a,b)));
}
// Search free water at obstacle edges. Vertical limits keep every label on its requested side.
export function placeIslandCallouts(labels:IslandCallout[],width:number,height:number,avoid:IslandLabel[]):IslandCallout[]{
 const gap=6,margin=8;
 const overlap=(a:IslandLabel,b:IslandLabel)=>Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>-gap+.01&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>-gap+.01;
 const bounded=labels.map(p=>({...p,minX:Math.max(margin,p.minX??margin),maxX:Math.min(width-p.width-margin,p.maxX??width),minY:Math.max(margin,Math.min(height-p.height-margin,p.minY??margin)),maxY:Math.min(height-p.height-margin,p.maxY??height)}));
 const freeArea=(p:typeof bounded[number])=>Math.max(1,p.maxX-p.minX+1)*Math.max(1,p.maxY-p.minY+1);
 const ordered=[...bounded].sort((a,b)=>freeArea(a)-freeArea(b));
 let visits=0;const placed:IslandCallout[]=[];
 function choices(p:IslandCallout){
  const blocks=[...avoid,...placed],lo=p.minY!,hi=Math.max(lo,p.maxY!);
  const xs=[p.x,p.minX!,p.maxX!,width/2-p.width/2,...blocks.flatMap(b=>[b.x-p.width-gap,b.x+b.width+gap])];
  const ys=[p.y,lo,hi,...blocks.flatMap(b=>[b.y-p.height-gap,b.y+b.height+gap])];
  const positions:IslandCallout[]=[],seen=new Set<string>();
  for(const x of xs)for(const y of ys){
   if(x<p.minX!-.01||x>p.maxX!+.01||y<lo-.01||y>hi+.01)continue;
   const key=Math.round(x*10)+','+Math.round(y*10);if(seen.has(key))continue;seen.add(key);
   const candidate={...p,x,y};if(blocks.some(b=>overlap(candidate,b)))continue;positions.push(candidate);
  }
  return positions.sort((a,b)=>Math.hypot(a.x-p.x,(a.y-p.y)*1.1)-Math.hypot(b.x-p.x,(b.y-p.y)*1.1)).slice(0,40);
 }
 function solve(index:number):boolean{
  if(index===ordered.length)return true;
  if(++visits>6000)return false;
  for(const p of choices(ordered[index])){placed.push(p);if(solve(index+1))return true;placed.pop();}
  return false;
 }
 if(solve(0))return labels.map(p=>placed.find(c=>c.id===p.id)!);
 // Keep the requested side even on a viewport too small to fit all labels.
 return bounded.map(p=>{const c=choices(p)[0];return c??{...p,x:Math.max(p.minX!,Math.min(p.maxX!,p.x)),y:Math.max(p.minY!,Math.min(p.maxY!,p.y))};});
}
