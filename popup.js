const KEY='gameEventTrackerDataV2';
const $=id=>document.getElementById(id);
document.getElementById('openTracker').addEventListener('click',()=>chrome.tabs.create({url:chrome.runtime.getURL('tracker.html')}));
(async()=>{const d=(await chrome.storage.local.get(KEY))[KEY]||{};const events=d.events||[];const todos=d.todos||[];const today=new Date().toISOString().slice(0,10);const due=events.filter(e=>e.due===today&&!e.completed).length;const active=events.filter(e=>today>=e.start&&today<=e.end&&!e.completed).length;const todoOpen=todos.filter(t=>!t.done).length;$('summary').innerHTML=`<div><b>${active}</b> active events today</div><div><b>${due}</b> reminders due today</div><div><b>${todoOpen}</b> open tasks</div>`;})();
