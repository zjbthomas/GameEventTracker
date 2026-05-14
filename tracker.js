function slotKey(dateIso,unit){if(unit==='day')return dateIso;if(unit==='total')return 'total';if(unit==='month'){const d=new Date(dateIso+'T00:00:00');return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;}const d=new Date(dateIso+'T00:00:00');const day=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-day);return d.toISOString().slice(0,10);}
function setEventCompletionPlan(ev,slotUnit,requiredPerSlot){if(!slotUnit||slotUnit==='none'||!requiredPerSlot){delete ev.progress;return;}ev.progress=ev.progress||{counts:{}};ev.progress.slotUnit=slotUnit;ev.progress.requiredPerSlot=Math.max(1,Number(requiredPerSlot)||1);ev.progress.counts=ev.progress.counts||{};}
function adjustEventCompletion(ev,dateIso,delta){if(!ev?.progress)return;const key=slotKey(dateIso,ev.progress.slotUnit);const now=ev.progress.counts[key]||0;const next=Math.max(0,now+delta);if(next===0)delete ev.progress.counts[key];else ev.progress.counts[key]=next;}
function eventProgressSummary(ev,dateIso){if(!ev?.progress)return'';const key=slotKey(dateIso,ev.progress.slotUnit);const done=ev.progress.counts[key]||0;const req=ev.progress.requiredPerSlot||1;const label=ev.progress.slotUnit==='week'?`week ${key}`:ev.progress.slotUnit==='month'?`month ${key}`:ev.progress.slotUnit==='total'?'whole event':`day ${key}`;return `<div class='muted'>Progress (${label}): ${done}/${req}</div>`;}
function formatLocalIso(date){const y=date.getFullYear();const m=String(date.getMonth()+1).padStart(2,'0');const d=String(date.getDate()).padStart(2,'0');return `${y}-${m}-${d}`;}
function todayIso(){return formatLocalIso(new Date());}
function dayHasIncompleteProgressAlert(dateIso){
  const today=todayIso();
  if(dateIso!==today)return false;
  const hasIncompleteProgress=s.events.some(ev=>{
    if(!ev?.progress||dateIso<ev.start||dateIso>ev.end)return false;
    const req=ev.progress.requiredPerSlot||1;
    if(ev.progress.slotUnit==='day'){
      const done=ev.progress.counts[dateIso]||0;
      return done<req;
    }
    if(ev.progress.slotUnit==='week'){
      const key=slotKey(dateIso,'week');
      const done=ev.progress.counts[key]||0;
      return done<req;
    }
    if(ev.progress.slotUnit==='total'){
      const done=ev.progress.counts.total||0;
      return done<req;
    }
    if(ev.progress.slotUnit==='month'){
      const key=slotKey(dateIso,'month');
      const done=ev.progress.counts[key]||0;
      return done<req;
    }
    return false;
  });
  if(hasIncompleteProgress)return true;
  return s.todos.some(t=>!t.done&&t.due===today);
}

function eventHasIncompleteAlertOnDate(ev,dateIso){
  if(!ev?.progress||dateIso<ev.start||dateIso>ev.end||dateIso>todayIso())return false;
  const req=ev.progress.requiredPerSlot||1;
  if(ev.progress.slotUnit==='day')return (ev.progress.counts[dateIso]||0)<req;
  if(ev.progress.slotUnit==='week')return (ev.progress.counts[slotKey(dateIso,'week')]||0)<req;
  if(ev.progress.slotUnit==='month')return (ev.progress.counts[slotKey(dateIso,'month')]||0)<req;
  if(ev.progress.slotUnit==='total')return (ev.progress.counts.total||0)<req;
  return false;
}
async function moveEventToDay(id,k){const ev=s.events.find(x=>x.id===id);if(!ev)return;const old={start:ev.start,end:ev.end};const len=(new Date(ev.end)-new Date(ev.start))/86400000;ev.start=k;ev.end=formatLocalIso(new Date(new Date(k+'T00:00:00').getTime()+len*86400000));s.selected=k;s.month=new Date(k+'T00:00:00');await save();showEventUndo('Event moved.',async()=>{ev.start=old.start;ev.end=old.end;await save();renderCal();renderDayEvents();});renderCal();renderDayEvents();}
const KEY='gameEventTrackerDataV2';
const s={events:[],todos:[],selected:null,month:new Date(),editing:null,editingTask:null,lastEventUndo:null,lastTaskUndo:null,dragEventId:null};
const $=id=>document.getElementById(id);const iso=d=>{const dt=new Date(d+'T00:00:00');return formatLocalIso(dt);};
async function load(){const d=(await chrome.storage.local.get(KEY))[KEY]||{};s.events=d.events||[];s.todos=d.todos||[]}
async function save(){await chrome.storage.local.set({[KEY]:{events:s.events,todos:s.todos}});await scheduleAlarms()}
const openModal=()=>$('eventModal').classList.remove('hidden'); const closeModal=()=>$('eventModal').classList.add('hidden');
const showEventUndo=(text,fn)=>{s.lastEventUndo=fn;$('eventUndoText').textContent=text;$('eventUndoBar').classList.remove('hidden');};
const showTaskUndo=(text,fn)=>{s.lastTaskUndo=fn;$('taskUndoText').textContent=text;$('taskUndoBar').classList.remove('hidden');};
function openCreateModal(date){s.editing=null;$('eventForm').reset();$('completionSlot').value='none';$('completionRequired').value='';$('color').value='#66c0f4';const d=date||s.selected||todayIso();$('start').value=d;$('end').value=d;openModal();}
function renderCal(){const g=$('grid');g.innerHTML=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>`<div class='muted'>${x}</div>`).join('');const y=s.month.getFullYear(),m=s.month.getMonth();$('month').textContent=s.month.toLocaleDateString('en-US',{month:'long',year:'numeric'});const pad=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();for(let i=0;i<pad;i++)g.innerHTML+='<div></div>';for(let d=1;d<=days;d++){const k=formatLocalIso(new Date(y,m,d));const c=document.createElement('div');c.className='cell'+(s.selected===k?' selected':'');const dayEvents=s.events.filter(e=>k>=e.start&&k<=e.end);const todoDue=s.todos.filter(t=>!t.done&&t.due===k).length;const dots=dayEvents.slice(0,3).map(e=>`<div class="dot" style="background:${e.color||'#66c0f4'}"></div>`).join('');const showAlert=dayHasIncompleteProgressAlert(k);c.innerHTML=`<div class='cell-head'><div class='d'>${d}</div>${showAlert?"<div class='progress-alert' title='Incomplete required progress'>⚠</div>":''}</div>${dots}${todoDue?`<div class='todo-dot'>${todoDue} task${todoDue>1?'s':''}</div>`:''}`;c.onclick=()=>{s.selected=k;renderCal();renderDayEvents();};c.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='move';c.classList.add('drop-target')};c.ondragleave=()=>c.classList.remove('drop-target');c.ondrop=async e=>{e.preventDefault();c.classList.remove('drop-target');const id=e.dataTransfer.getData('text/event')||e.dataTransfer.getData('text/plain')||s.dragEventId;if(!id)return;await moveEventToDay(id,k);};g.appendChild(c)}}
function renderDayEvents(){if(!s.selected){$('dayEvents').textContent='Select a day to view events.';return;}const list=s.events.filter(e=>s.selected>=e.start&&s.selected<=e.end);$('dayEvents').innerHTML=`<h4>${s.selected}</h4>`+(list.map(e=>`<div class='event-chip' draggable='true' data-e='${e.id}' style='border-left:4px solid ${e.color||'#66c0f4'}'><div class='event-main'><b>${e.game}</b><span>${e.title}</span>${eventHasIncompleteAlertOnDate(e,s.selected)?"<div class='muted'><span class='progress-alert' title='Incomplete required progress'>⚠</span> Incomplete required progress</div>":''}${eventProgressSummary(e,s.selected)}</div><div class='event-actions'>${e.progress?`<button class='mini' data-dec='${e.id}'>-1</button><button class='mini' data-inc='${e.id}'>+1</button>`:''}<button class='mini' data-edit='${e.id}'>Edit</button><button class='mini' data-dup='${e.id}'>Duplicate</button><button class='mini mini-danger' data-ev-del='${e.id}'>Delete</button></div></div>`).join('')||'<div class="muted">No events</div>');
 document.querySelectorAll('[data-inc]').forEach(b=>b.onclick=async()=>{const ev=s.events.find(x=>x.id===b.dataset.inc);if(!ev)return;adjustEventCompletion(ev,s.selected,1);await save();renderDayEvents();});
 document.querySelectorAll('[data-dec]').forEach(b=>b.onclick=async()=>{const ev=s.events.find(x=>x.id===b.dataset.dec);if(!ev)return;adjustEventCompletion(ev,s.selected,-1);await save();renderDayEvents();});
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editEvent(b.dataset.edit));
 document.querySelectorAll('[data-dup]').forEach(b=>b.onclick=()=>duplicateEvent(b.dataset.dup));
 document.querySelectorAll('[data-ev-del]').forEach(b=>b.onclick=()=>deleteEvent(b.dataset.evDel));
 document.querySelectorAll('[data-e]').forEach(chip=>{chip.draggable=true;chip.ondragstart=e=>{s.dragEventId=chip.dataset.e;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/event',chip.dataset.e);e.dataTransfer.setData('text/plain',chip.dataset.e);const h=$('dragHint');h.classList.remove('hidden');h.textContent='Drag to a day, then release';};chip.ondragend=()=>{s.dragEventId=null;$('dragHint').classList.add('hidden');document.querySelectorAll('.drop-target').forEach(n=>n.classList.remove('drop-target'));};});
}
function editEvent(id){const e=s.events.find(x=>x.id===id);if(!e)return;s.editing=id;$('game').value=e.game;$('title').value=e.title;$('start').value=e.start;$('end').value=e.end;$('due').value=e.due||'';$('notes').value=e.notes||'';$('color').value=e.color||'#66c0f4';$('completionSlot').value=e.progress?.slotUnit||'none';$('completionRequired').value=e.progress?.requiredPerSlot||'';openModal()}
async function duplicateEvent(id){const e=s.events.find(x=>x.id===id);if(!e)return;s.events.push({...e,id:crypto.randomUUID(),title:e.title+' (Copy)'});await save();renderCal();renderDayEvents()}
async function deleteEvent(id){const idx=s.events.findIndex(e=>e.id===id);if(idx<0)return;const removed=s.events[idx];s.events.splice(idx,1);await save();showEventUndo('Event deleted.',async()=>{s.events.push(removed);await save();renderCal();renderDayEvents();});renderCal();renderDayEvents()}
function renderTodos(){const ul=$('todoList');ul.innerHTML=s.todos.map(t=>`<li class='todo-row'><button class='circle ${t.done?'done':''}' data-d='${t.id}'></button><div class='todo-title ${t.done?'done':''}'>${t.text}${t.notes?`<div class="task-note">${t.notes}</div>`:''}</div><div>${t.due||''}</div><div class='event-actions'><button class='mini' data-tedit='${t.id}'>Edit</button><button class='mini mini-danger' data-task-del='${t.id}'>Delete</button></div></li>`).join('')||'<li class="muted">No tasks yet.</li>';document.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>toggleTodo(b.dataset.d));document.querySelectorAll('[data-tedit]').forEach(b=>b.onclick=()=>openTaskModal(b.dataset.tedit));document.querySelectorAll('[data-task-del]').forEach(b=>b.onclick=()=>deleteTodo(b.dataset.taskDel));}
async function deleteTodo(id){const idx=s.todos.findIndex(t=>t.id===id);if(idx<0)return;const removed=s.todos[idx];s.todos.splice(idx,1);await save();showTaskUndo('Task deleted.',async()=>{s.todos.push(removed);await save();renderTodos();renderCal();});renderTodos();renderCal()}
async function toggleTodo(id){const t=s.todos.find(x=>x.id===id);if(!t)return;t.done=!t.done;await save();renderTodos();renderCal()}
async function scheduleAlarms(){const old=await chrome.alarms.getAll();await Promise.all(old.filter(a=>a.name.startsWith('ev-')).map(a=>chrome.alarms.clear(a.name)));for(const e of s.events){if(e.due){const when=new Date(e.due+'T09:00:00').getTime();if(when>Date.now())chrome.alarms.create('ev-'+e.id,{when});}}}
async function gameSearch(q){if(q.length<2){$('suggestions').innerHTML='';return;}try{const r=await fetch(`https://store.steampowered.com/search/suggest?term=${encodeURIComponent(q)}&f=games&cc=US&l=english`);const tx=await r.text();const names=[...tx.matchAll(/class="match_name">([^<]+)</g)].map(m=>m[1]);$('suggestions').innerHTML=names.slice(0,8).map(n=>`<div class='s-item'>${n}</div>`).join('');document.querySelectorAll('.s-item').forEach(i=>i.onclick=()=>{$('game').value=i.textContent;$('suggestions').innerHTML='';});}catch{}}

function openTaskModal(id=''){const t=s.todos.find(x=>x.id===id);s.editingTask=id||null;$('taskForm').reset();$('taskName').value=t?.text||'';$('taskDate').value=t?.due||'';$('taskNotes').value=t?.notes||'';$('taskModal').classList.remove('hidden');}
function closeTaskModal(){$('taskModal').classList.add('hidden');}

async function init(){await load();closeModal();$('addEventBtn').onclick=()=>openCreateModal();$('prev').onclick=()=>{s.month.setMonth(s.month.getMonth()-1);renderCal();};$('next').onclick=()=>{s.month.setMonth(s.month.getMonth()+1);renderCal();};$('today').onclick=()=>{const now=new Date();s.month=new Date(now.getFullYear(),now.getMonth(),1);s.selected=todayIso();renderCal();renderDayEvents();};$('closeModal').onclick=closeModal;
$('eventModal').addEventListener('click',e=>{if(e.target.id==='eventModal')closeModal();});$('taskModal').addEventListener('click',e=>{if(e.target.id==='taskModal')closeTaskModal();});document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();closeTaskModal();}});
$('eventForm').onsubmit=async e=>{e.preventDefault();const existing=s.events.find(x=>x.id===s.editing);const p={id:s.editing||crypto.randomUUID(),game:$('game').value.trim(),title:$('title').value.trim(),start:iso($('start').value),end:iso($('end').value),due:$('due').value?iso($('due').value):'',notes:$('notes').value.trim(),color:$('color').value||'#66c0f4',progress:existing?.progress?structuredClone(existing.progress):undefined};if(p.end<p.start)return alert('End date cannot be before start date.');setEventCompletionPlan(p,$('completionSlot').value,$('completionRequired').value);s.events=s.events.filter(x=>x.id!==p.id).concat(p);s.selected=p.start;await save();closeModal();renderCal();renderDayEvents();};

$('eventUndoBtn').onclick=async()=>{if(!s.lastEventUndo)return;const fn=s.lastEventUndo;s.lastEventUndo=null;$('eventUndoBar').classList.add('hidden');await fn();};
$('taskUndoBtn').onclick=async()=>{if(!s.lastTaskUndo)return;const fn=s.lastTaskUndo;s.lastTaskUndo=null;$('taskUndoBar').classList.add('hidden');await fn();};$('addTaskBtn').onclick=()=>openTaskModal();$('closeTaskModal').onclick=closeTaskModal;$('taskForm').onsubmit=async e=>{e.preventDefault();const t={id:s.editingTask||crypto.randomUUID(),text:$('taskName').value.trim(),due:$('taskDate').value||'',notes:$('taskNotes').value.trim(),done:s.todos.find(x=>x.id===s.editingTask)?.done||false};s.todos=s.todos.filter(x=>x.id!==t.id).concat(t);closeTaskModal();await save();renderTodos();renderCal();};
$('game').addEventListener('input',e=>gameSearch(e.target.value));$('importBtn').onclick=()=>$('importFile').click();document.addEventListener('dragover',e=>{if(!$('dragHint').classList.contains('hidden')){$('dragHint').style.left=(e.clientX+12)+'px';$('dragHint').style.top=(e.clientY+12)+'px';}});
$('exportBtn').onclick=()=>{const b=new Blob([JSON.stringify({events:s.events,todos:s.todos},null,2)],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='game-event-tracker-backup.json';a.click();URL.revokeObjectURL(u);};
$('importFile').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;const d=JSON.parse(await f.text());s.events=d.events||[];s.todos=d.todos||[];await save();renderCal();renderDayEvents();renderTodos();};
renderCal();renderDayEvents();renderTodos();}
init();