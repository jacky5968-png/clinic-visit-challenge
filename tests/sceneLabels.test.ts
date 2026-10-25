import { describe, it, expect } from 'vitest';
import { layoutSceneLabels } from '../src/three/layoutSceneLabels';
describe('readable scene labels', () => {
  for (const width of [286, 350, 690, 1000]) {
    it(`keeps four labels apart inside a ${width}px viewport, clear of the caption`, () => {
      const labels = ['doctor','reception','waiting','entrance'].map((id,i) => ({
        id, x: width/2 + i*4, y: 260, width: i===1 ? 150 : 130, height: 46
      }));
      const placed = layoutSceneLabels(labels, width, 450);
      expect(placed.map(p=>p.id)).toEqual(labels.map(p=>p.id));
      for (const p of placed) {
        expect(p.left).toBeGreaterThanOrEqual(8);
        expect(p.top).toBeGreaterThanOrEqual(8);
        expect(p.left+p.width).toBeLessThanOrEqual(width-8);
        expect(p.top+p.height).toBeLessThanOrEqual(370);
      }
      for (let i=0;i<placed.length;i++) for(let j=i+1;j<placed.length;j++){
        const a=placed[i],b=placed[j];
        expect(a.left+a.width+8<=b.left || b.left+b.width+8<=a.left ||
          a.top+a.height+8<=b.top || b.top+b.height+8<=a.top).toBe(true);
      }
    });
  }
  it('retains the projected position when there is room', () => {
    const [p]=layoutSceneLabels([{id:'doctor',x:300,y:200,width:140,height:46}],800,500);
    expect(p.left).toBe(230); expect(p.top).toBe(154);
  });
  it('keeps off-edge anchors within the visible area', () => {
    const p=layoutSceneLabels([
      {id:'doctor',x:-150,y:-50,width:140,height:46},
      {id:'waiting',x:900,y:700,width:140,height:46}
    ],350,450);
    expect(p[0].left).toBe(8); expect(p[0].top).toBe(8);
    expect(p[1].left+p[1].width).toBe(342); expect(p[1].top+p[1].height).toBe(370);
  });
});

it('keeps enlarged labels off physical object hit areas on narrow screens', () => {
  const obstacles = [{left:80,top:180,width:44,height:44},{left:140,top:210,width:44,height:44},{left:120,top:160,width:44,height:44}];
  const labels = ['doctor','reception','waiting','entrance'].map(id=>({id,x:140,y:230,width:130,height:46}));
  const placed=layoutSceneLabels(labels,286,450,obstacles);
  for(const a of placed) for(const b of obstacles)
    expect(a.left+a.width+8<=b.left || b.left+b.width+8<=a.left || a.top+a.height+8<=b.top || b.top+b.height+8<=a.top).toBe(true);
});
