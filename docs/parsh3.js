/* ===== YoriGram patch v3 =====
   Подключить в index.html ПОСЛЕ последнего <script>:  <script src="patch3.js"></script> */
(()=>{
const $=id=>document.getElementById(id);
document.head.insertAdjacentHTML('beforeend',`<style>
.m.sel{filter:brightness(1.35);outline:2px solid var(--acc);outline-offset:1px}
.m{position:relative}
.hrt{position:fixed;z-index:70;font-size:56px;pointer-events:none;transform:translate(-50%,-50%);animation:hrt .85s ease-out forwards}
@keyframes hrt{0%{transform:translate(-50%,-50%) scale(.2);opacity:0}25%{transform:translate(-50%,-50%) scale(1.25);opacity:1}60%{transform:translate(-50%,-60%) scale(1)}100%{transform:translate(-50%,-120%) scale(1);opacity:0}}
.sn{cursor:pointer}
</style>`);

/* --- 1. Ники "?" и чужой профиль: prof() падал, если в profiles нет колонок last_seen/hide_online --- */
const FULL='id,username,display_name,avatar,banner,bio,birthday,uid,hide_username,is_bot,last_seen,hide_online',
      BASE='id,username,display_name,avatar,banner,bio,birthday,uid,hide_username,is_bot';
async function fetchProfiles(q){let r=await q(FULL);if(r.error)r=await q(BASE);return r.data||[]}
prof=async function(ids){const n=[...new Set(ids)].filter(i=>i&&!pmap[i]);if(!n.length)return;
  (await fetchProfiles(c=>sb.from('profiles').select(c).in('id',n))).forEach(p=>pmap[p.id]=Object.assign(pmap[p.id]||{},p))};
async function openUser(id){const d=await fetchProfiles(c=>sb.from('profiles').select(c).eq('id',id).limit(1));
  if(d[0])pmap[id]=Object.assign(pmap[id]||{},d[0]);if(!pmap[id])return toast('Профиль не найден');ptab='posts';peerProfile(pmap[id])}
window.openUser=openUser;
const _oc=openChat;openChat=function(c){_oc(c);if(c.kind=='dm'){const h=document.querySelector('#chh .hd');if(h)h.onclick=()=>openUser(c.peer)}};

/* --- 2. В списке только чаты, где есть переписка --- */
const _rc=renderChats;renderChats=function(){const all=chats;
  chats=all.filter(c=>c.kind!='dm'||last[c.id]||(cur&&cur.id==c.id));try{_rc()}finally{chats=all}};
const _lc=loadChats;loadChats=async function(){await _lc();
  const miss=chats.filter(c=>c.kind=='dm'&&!last[c.id]);if(!miss.length)return;
  await Promise.all(miss.map(async c=>{const {data}=await sb.from('messages').select('id,chat_id,kind,body,created_at').eq('chat_id',c.id).order('id',{ascending:false}).limit(1);if(data&&data[0])last[c.id]=data[0]}));
  if(tab=='chats')renderChats()};

/* --- 3. Выделение сообщения (долгое нажатие / свайп) --- */
let selId=0;
const mark=()=>{document.querySelectorAll('.m.sel').forEach(x=>x.classList.remove('sel'));const e=selId&&document.querySelector(`#msgs [data-mid="${selId}"]`);if(e)e.classList.add('sel')};
new MutationObserver(()=>{if(!$('sheet').classList.contains('open')){selId=0;mark()}}).observe($('sheet'),{attributes:true,attributeFilter:['class']});
const _mm=msgMenu;msgMenu=function(id){selId=id;mark();_mm(id)};
const _lm=loadMsgs;loadMsgs=async function(){await _lm();mark();
  document.querySelectorAll('#msgs .m .sn').forEach(s=>{const m=mcache[s.closest('.m').dataset.mid];if(m)s.onclick=e=>{e.stopPropagation();openUser(m.sender)}})};

let el=null,x0,y0,on=0,done=0;
document.addEventListener('pointerdown',e=>{sm=0; /* отключаем старый свайп из patch v2 */
  const t=e.target.closest('#msgs .m[data-mid]');el=t&&!t.classList.contains('gift')?t:null;x0=e.clientX;y0=e.clientY;on=0;done=0});
document.addEventListener('pointermove',e=>{if(!el||done)return;const dx=e.clientX-x0,dy=e.clientY-y0;
  if(!on&&dx<-12&&Math.abs(dy)<Math.abs(dx)){on=1;clearTimeout(lpT);el.classList.add('sel');el.style.transition='none'}
  if(on){el.style.transform=`translateX(${Math.max(dx,-90)}px)`;
    if(dx<-70){done=1;lpF=Date.now();S.vb!==0&&navigator.vibrate&&navigator.vibrate(12);const id=+el.dataset.mid;el.style.transition='.2s';el.style.transform='';msgMenu(id)}}});
['pointerup','pointercancel'].forEach(k=>document.addEventListener(k,()=>{if(el&&on&&!done){el.style.transition='.2s';el.style.transform='';el.classList.remove('sel')}el=null}));

/* --- 4. Двойной тап = быстрая реакция (меняется в настройках) --- */
react=async function(mid,e,add){sheetClose();
  const {data:mine}=await sb.from('reactions').select('emoji').eq('message_id',mid).eq('user_id',me.id).maybeSingle();
  if(mine&&mine.emoji==e&&!add)await sb.from('reactions').delete().eq('message_id',mid).eq('user_id',me.id);
  else await sb.from('reactions').upsert({message_id:mid,user_id:me.id,emoji:e});loadMsgs()};
let lt=0,lid=0;
document.addEventListener('click',e=>{const t=e.target.closest('#msgs .m[data-mid]');
  if(!t||t.classList.contains('gift')||e.target.closest('video,a,code,.vp,.rx,.sn,img'))return;
  const id=+t.dataset.mid,now=Date.now();
  if(id==lid&&now-lt<320){lt=lid=0;const q=S.qr||'❤️',r=t.getBoundingClientRect(),h=document.createElement('div');
    h.className='hrt';h.textContent=q;h.style.left=(r.left+r.width/2)+'px';h.style.top=(r.top+r.height/2)+'px';document.body.append(h);setTimeout(()=>h.remove(),900);
    S.vb!==0&&navigator.vibrate&&navigator.vibrate(10);react(id,q,true)}
  else{lt=now;lid=id}});
const QR=['❤️','👍','😂','🔥','😮','😢','🎉','👎'];
const _cs=chatSettings;chatSettings=function(){_cs();const f=document.querySelector('#sb2 .f');if(!f)return;
  f.insertAdjacentHTML('afterbegin',`<small>Быстрая реакция (двойной тап по сообщению)</small><div class="wps" style="flex-wrap:wrap">${QR.map(e=>`<button class="sw" style="font-size:1.5rem;background:var(--pan);outline:2px solid ${(S.qr||'❤️')==e?'var(--acc)':'transparent'}" onclick="setS('qr','${e}');chatSettings()">${e}</button>`).join('')}</div>`)};
})();