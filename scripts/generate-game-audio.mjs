import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Original mathematical synthesis; no recordings, samples or borrowed melodies.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'public/assets/audio');
const rate=22050,beat=.6,tau=Math.PI*2;
const hz=m=>440*2**((m-69)/12);
let seed=5968;
const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
function tone(buffer,start,duration,midi,level,voice='wood',loop=false){
 const frequency=hz(midi),count=Math.ceil(duration*rate),offset=Math.round(start*rate);
 for(let i=0;i<count;i++){
  const t=i/rate,attack=Math.min(1,t/.008),release=Math.min(1,(duration-t)/.055);
  const phase=tau*frequency*t;
  const wave=voice==='wood'?(Math.sin(phase)*Math.exp(-t*7)+.22*Math.sin(phase*2.76)*Math.exp(-t*16))
   :voice==='bass'?Math.sin(phase)*Math.exp(-t*3)
   :(Math.sin(phase)+.13*Math.sin(phase*2)+.045*Math.sin(phase*3))*Math.exp(-t*.9);
  const index=loop?(offset+i)%buffer.length:offset+i;
  if(index>=0&&index<buffer.length)buffer[index]+=wave*attack*release*level;
 }
}
function tap(buffer,start,level,soft=false,loop=false){
 const count=Math.round(rate*(soft?.11:.045)),offset=Math.round(start*rate);
 let filtered=0;
 for(let i=0;i<count;i++){
  const t=i/rate,n=noise();filtered=filtered*.78+n*.22;
  const envelope=Math.min(1,t/.003)*Math.exp(-t*(soft?40:110))*Math.min(1,(count-i)/80);
  const wave=soft?.7*filtered+.3*Math.sin(tau*155*t):n*.45;
  const index=loop?(offset+i)%buffer.length:offset+i;
  if(index<buffer.length)buffer[index]+=wave*envelope*level;
 }
}
const manifest=[];
function save(relative,buffer,peak){
 let maximum=0;for(const value of buffer)maximum=Math.max(maximum,Math.abs(value));
 const scale=maximum?peak/maximum:0,bytes=Buffer.alloc(44+buffer.length*2);
 bytes.write('RIFF',0);bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);
 bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(rate,24);bytes.writeUInt32LE(rate*2,28);
 bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(buffer.length*2,40);
 let squares=0;
 for(let i=0;i<buffer.length;i++){buffer[i]*=scale;squares+=buffer[i]**2;bytes.writeInt16LE(Math.round(buffer[i]*32767),44+i*2);}
 const target=path.join(output,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
 manifest.push({file:relative,durationSeconds:buffer.length/rate,sampleRate:rate,channels:1,bytes:bytes.length,peak,rms:Number(Math.sqrt(squares/buffer.length).toFixed(5)),seamJump:Number(Math.abs(buffer[0]-buffer.at(-1)).toFixed(6))});
}
const theme=new Float32Array(Math.round(32*4*beat*rate));
const chords=[[48,60,64,67,74],[47,59,62,67,69],[45,57,60,64,71],[41,53,57,60,67],[40,55,60,64,67],[38,53,57,60,64],[43,55,59,62,69],[43,55,60,62,67]];
const melodies=[[72,76,79,76,74,72],[71,74,79,74,76,74],[72,76,81,79,76,72],[69,72,77,76,72,69],[67,72,76,79,76,72],[69,74,77,76,74,72],[71,74,79,81,79,74],[74,76,74,71,69,71]];
const times=[0,.75,1.5,2,2.75,3.5];
for(let bar=0;bar<32;bar++){
 const at=bar*4*beat,chord=chords[bar%8];
 tone(theme,at,2.8*beat,chord[0],.2,'bass',true);
 for(const note of chord.slice(1)){tone(theme,at,2.3*beat,note,.055,'keys',true);tone(theme,at+2.5*beat,1.7*beat,note,.035,'keys',true);}
 for(let n=0;n<6;n++)if(!(bar>=24&&n%2===1))tone(theme,at+times[n]*beat,.7,melodies[bar%8][n]+(bar>=16&&bar<24?-12:0),.14,'wood',true);
 for(let n=0;n<4;n++){tap(theme,at+n*beat,.028,true,true);tap(theme,at+(n+.5)*beat,.009,false,true);}
}
save('bgm/field-theme.wav',theme,.65);
function effect(file,duration,notes,peak=.42){
 const buffer=new Float32Array(Math.ceil(rate*duration));
 for(const [at,note,length,level=.2,voice='wood'] of notes)tone(buffer,at,length,note,level,voice);
 save('sfx/'+file+'.wav',buffer,peak);
}
effect('click',.13,[[0,84,.115]],.3);
const step=new Float32Array(Math.round(rate*.14));tap(step,0,.6,true);save('sfx/step.wav',step,.13);
effect('enter',.7,[[0,60,.38],[.12,64,.38],[.24,67,.4]],.4);
effect('question',.45,[[0,76,.3],[.13,79,.29]],.34);
effect('correct',.65,[[0,72,.3],[.12,76,.3],[.25,79,.36]],.43);
effect('wrong',.65,[[0,67,.3],[.17,64,.4]],.35);
effect('success',3.8,[[0,60,.9,.15,'keys'],[0,64,.9,.15,'keys'],[0,67,.9,.15,'keys'],[.08,72,.55],[.42,76,.55],[.76,79,.6],[1.12,84,.9],[1.78,79,.55],[2.15,81,.55],[2.5,79,1.2,.17,'keys'],[2.5,72,1.2,.13,'keys'],[2.5,76,1.2,.13,'keys']],.5);
effect('retry',1.3,[[0,64,.45],[.25,67,.45],[.5,72,.7,.2,'keys']],.4);
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify({source:'本專案原創程序合成；無第三方錄音、取樣、人聲或歌詞。',license:'允許本專案及衍生版本使用、修改與散布，無需署名；不更動專案其他素材授權。',generator:'scripts/generate-game-audio.mjs',bpm:100,loopBars:32,files:manifest},null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
