import {readdirSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const ops:number[][]=[];
for(const [op,d] of [
 [0,[0,0,0]],[1,[1,0,1]],[2,[4,0,1]],[3,[0,1,0]],
 [4,[0,1,2]],[5,[0,2,2]],[6,[0,2,3]],[7,[0,3,3]],
 ...[16,17,18,19,20,21,22,24,25,26,28,29,30,32,33,34].map(x=>[x,[0,2,1]] as [number,number[]]),
 [23,[0,1,1]],[27,[0,1,1]],[48,[2,0,0]],
 [49,[2,1,0]],[50,[2,1,0]],[51,[2,0,0]],[52,[0,0,0]],
 [64,[0,1,1]],[65,[0,2,0]],[80,[0,1,0]],[81,[0,1,0]],
 [82,[0,0,1]],[83,[0,1,0]]])ops[op]=d;
function run(p:Buffer,i:Buffer){
 const s:number[]=[],c:number[]=[],m=new Int32Array(256),o=Buffer.alloc(65536);
 let pc=0,ip=0,n=0,steps=0,e=0;
 for(;;){
  if(steps===1000000){e=10;break;}
  if(pc<0||pc>=p.length){e=9;break;}
  const op=p[pc++],d=ops[op];
  if(!d){e=5;break;}
  const [w,pop,push]=d;
  if(pc+w>p.length){e=9;break;}
  let v=w===1?p.readInt8(pc):w===4?p.readInt32LE(pc):w===2?p.readUInt16LE(pc):0;
  pc+=w;steps++;
  if(s.length<pop){e=2;break;}
  if(s.length-pop+push>256){e=3;break;}
  let b=pop?s.pop()!:0,a=pop>1?s.pop()!:0,r=0;
  switch(op){
   case 0:return {o:o.subarray(0,n),e:0};
   case 1:case 2:s.push(v);break;
   case 3:break;
   case 4:s.push(b,b);break;
   case 5:s.push(b,a);break;
   case 6:s.push(a,b,a);break;
   case 7:r=s.pop()!;s.push(a,b,r);break;
   case 16:r=a+b;break;
   case 17:r=a-b;break;
   case 18:r=Math.imul(a,b);break;
   case 19:case 20:case 21:case 22:
    if(b===0){e=4;break;}
    r=op===19?a/b:op===20?a%b:op===21?(a>>>0)/(b>>>0):(a>>>0)%(b>>>0);break;
   case 23:r=-b;break;
   case 24:r=a&b;break;
   case 25:r=a|b;break;
   case 26:r=a^b;break;
   case 27:r=~b;break;
   case 28:r=a<<b;break;
   case 29:r=a>>b;break;
   case 30:r=a>>>b;break;
   case 32:r=+(a===b);break;
   case 33:r=+(a<b);break;
   case 34:r=+((a>>>0)<(b>>>0));break;
   case 48:case 49:case 50:
    if(op===48||(op===49?b===0:b!==0))pc+=(v<<16)>>16;break;
   case 51:if(c.length===64)e=7;else{c.push(pc);pc=v;}break;
   case 52:if(!c.length)e=8;else pc=c.pop()!;break;
   case 64:case 65:
    if(b<0||b>255){e=6;break;}
    if(op===64)s.push(m[b]);else m[b]=a;break;
   case 80:case 81:{
    const t=op===80?String(b):'',len=op===80?t.length:1;
    if(n+len>65536)e=11;else{if(op===80)o.write(t,n);else o[n]=b&255;n+=len;}break;
   }
   case 82:s.push(ip<i.length?i[ip++]:-1);break;
   case 83:return {o:o.subarray(0,n),e:b&255};
  }
  if(e)break;
  if((op>=16&&op<=30)||(op>=32&&op<=34))s.push(r|0);
 }
 return {o:o.subarray(0,n),e};
}
const src=process.env.MAKEFUN_INPUT_DIR||process.env.INPUT_DIR||'/input',dst=process.env.MAKEFUN_OUTPUT_DIR||process.env.OUTPUT_DIR||'/output';
for(const id of readdirSync(src).sort()){
 const dir=join(src,id);
 if(!/^i\d+$/.test(id))continue;
 const r=run(readFileSync(join(dir,'program.bin')),readFileSync(join(dir,'input.bin'))),out=join(dst,id);
 mkdirSync(out,{recursive:true});writeFileSync(join(out,'stdout.bin'),r.o);writeFileSync(join(out,'exit.txt'),String(r.e));
}
