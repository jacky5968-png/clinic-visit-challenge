import {expect,it} from 'vitest';
import geometry from './fixtures/island05-left-zoomout.json';
import orthoMobile from './fixtures/ortho-nearby-mobile-right.json';
import {islandLabelsFit,placeIslandCallouts} from '../src/engine/islandLabels';

it('keeps 05 beside its own roof without covering buildings or other labels at the narrow left zoom limit',()=>{
 const placed=placeIslandCallouts(geometry.labels,geometry.width,geometry.height,geometry.avoid);
 expect(islandLabelsFit(placed,geometry.width,geometry.height,geometry.avoid)).toBe(true);
 const callout=placed.find(p=>p.id==='gastro')!,roof=geometry.avoid.find(p=>p.id==='building-gastro')!;
 expect(roof.y-callout.y-callout.height).toBeGreaterThanOrEqual(8);
 expect(roof.y-callout.y-callout.height).toBeLessThanOrEqual(26);
 expect(Math.abs(callout.x+callout.width/2-roof.x-roof.width/2)).toBeLessThan(30);
 // These limits must remain active during the cached-frame fast path too.
 const displaced=placed.map(p=>p.id==='gastro'?{...p,x:p.x+80}:p);
 expect(islandLabelsFit(displaced,geometry.width,geometry.height,geometry.avoid)).toBe(false);
});

it('keeps 05 and 06 beside their own roofs without collisions on the right-rotated phone map',()=>{
 const placed=placeIslandCallouts(orthoMobile.labels,orthoMobile.width,orthoMobile.height,orthoMobile.avoid);
 expect(islandLabelsFit(placed,orthoMobile.width,orthoMobile.height,orthoMobile.avoid)).toBe(true);
 for(const [id,maxGap,maxOffset] of [['gastro',26,40],['orthopedics',32,48]] as const){
  const label=placed.find(p=>p.id===id)!,roof=orthoMobile.avoid.find(p=>p.id==='building-'+id)!;
  expect(roof.y-label.y-label.height).toBeGreaterThanOrEqual(8);
  expect(roof.y-label.y-label.height).toBeLessThanOrEqual(maxGap);
  expect(Math.abs(label.x+label.width/2-roof.x-roof.width/2)).toBeLessThanOrEqual(maxOffset+.1);
 }
 const displaced=placed.map(p=>p.id==='orthopedics'?{...p,y:p.y-100}:p);
 expect(islandLabelsFit(displaced,orthoMobile.width,orthoMobile.height,orthoMobile.avoid)).toBe(false);
});
