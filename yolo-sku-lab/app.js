import {JournalSync} from './sync.js';
import {CaptureUI} from './capture-ui.js';
import {PLAN} from './plan.js';
import {STATUS,SHELVES,SERIES,escapeHtml as esc,productMatches,sceneMatches,footprint,cleanRecords,csvCell} from './logic.js';
const $=id=>document.getElementById(id);
const products=new Map(PLAN.products.map(p=>[p.number,p]));
const isolated=PLAN.products.map(p=>({...p,id:'SKU_'+p.sku_id,mode:'isolated',series:'isolated',purpose:'halfsynth',sku_order:[p.number],shelf:null}));
const scenes=[...PLAN.empty_scenes,...PLAN.scenes,...isolated];
const byId=new Map(scenes.map(s=>[s.id,s]));
const validIds=new Set(byId.keys());
const KEY='yolo-shelf-lab:34:plan-v1';
const defaultRecord=()=>({status:'planned',note:'',session:'',capture:'',review:'',problem:'',operator:'',updatedAt:null});
let records=Object.create(null),storageAvailable=true;
try{const raw=localStorage.getItem(KEY);if(raw)records=cleanRecords(JSON.parse(raw),validIds);}catch{storageAvailable=false;}
let selected=byId.has(decodeURIComponent(location.hash.slice(1)))?decodeURIComponent(location.hash.slice(1)):PLAN.scenes[0].id;
let search='',series=byId.get(selected).mode==='isolated'?'isolated':byId.get(selected).series?'all':'empty',shelf='all',status='all';
let toastTimer;
const palette=['#5c7ddb','#bd8651','#64988b','#aa85b6','#7198b4','#bf927c','#92a262'];
const record=id=>records[id]??defaultRecord();
const phase=s=>s.series??'empty';
const listForPhase=s=>s.mode==='isolated'?isolated:s.series?PLAN.scenes:PLAN.empty_scenes;
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3000);}
function savedText(){return sync.label();}
function setRecord(change){sync.edit(selected,change);}
function totals(){return {done:PLAN.scenes.filter(s=>record(s.id).status==='checked').length,reshoot:PLAN.scenes.filter(s=>record(s.id).status==='reshoot').length,empty:PLAN.empty_scenes.filter(s=>record(s.id).status==='checked').length};}
function renderSidebar(){
 const candidates=series==='empty'?PLAN.empty_scenes:series==='isolated'?isolated:PLAN.scenes;
 const found=candidates.filter(s=>(series==='all'||phase(s)===series)&&(shelf==='all'||s.shelf===Number(shelf))&&(status==='all'||record(s.id).status===status)&&sceneMatches(s,search,products));
 $('result-count').textContent=found.length;
 $('scene-list').innerHTML=found.length?found.map(s=>{const r=record(s.id);return `<button class="scene-row ${s.id===selected?'active':''}" data-scene="${s.id}" aria-current="${s.id===selected?'true':'false'}" aria-label="${esc(s.id)}, ${s.mode==='isolated'?'Отдельный SKU':SHELVES[s.shelf]+' полка'}, ${s.yaw_deg??'без'} градусов, ${STATUS[r.status]}"><span class="scene-order ${r.status}">${r.status==='checked'?'✓':r.status==='reshoot'?'↻':(s.order?String(s.order).padStart(2,'0'):'∅')}</span><span><span class="scene-row-title">${s.mode==='isolated'?esc(s.name):(s.series?`Набор ${s.series}${s.group}`:'Пустая полка')+' · '+SHELVES[s.shelf].toLowerCase()}</span><span class="scene-row-sub">${s.id}</span></span><span class="scene-angle">${s.yaw_deg==null?'—':s.yaw_deg+'°'}</span></button>`;}).join(''):'<div class="list-empty">Ничего не найдено.<br>Попробуйте название товара, SKU ID или другую серию.</div>';
 document.querySelectorAll('[data-series]').forEach(b=>{b.classList.toggle('selected',b.dataset.series===series);b.setAttribute('aria-pressed',String(b.dataset.series===series));});
 const t=totals();$('overall-count').textContent=`${t.done} из 60 проверено`;$('progress-bar').style.width=`${t.done/60*100}%`;
 updateHighlights();
}
function updateHighlights(){document.querySelectorAll('.product-card[data-sku]').forEach(c=>c.classList.toggle('match',productMatches(products.get(Number(c.dataset.sku)),search)));}
function shelfDrawing(s){
 let body='';
 for(let i=0;i<7;i++){
  const n=s.sku_order[i],x=PLAN.shelf.row_centers_cm[i]*10;
  body+=`<line x1="${x}" y1="35" x2="${x}" y2="570" stroke="#e5e9f0" stroke-dasharray="4 7"/><text x="${x}" y="23" fill="#96a0af" font-size="20" text-anchor="middle">ПОЗ. ${i+1}</text>`;
  if(n==null){body+=`<rect x="${x-45}" y="400" width="90" height="120" rx="10" fill="none" stroke="#dfe5ed" stroke-dasharray="6 6"/><text x="${x}" y="465" fill="#bec6d2" font-size="25" text-anchor="middle">—</text>`;continue;}
  const p=products.get(n),f=footprint(p,s.yaw_deg),color=palette[i];
  body+=`<g class="shelf-slot" data-position="${i+1}"><title>Позиция ${i+1}: ${esc(p.name)}, SKU ${p.sku_id}, ${s.yaw_deg}°</title>`;
  for(let copy=2;copy>=0;copy--){
   const setback=s.front_setback_cm[i],y=590-(setback+f.depth/2+copy*(f.depth+PLAN.shelf.depth_gap_cm))*10;
   const shape=f.round?`<ellipse cx="0" cy="0" rx="${f.a*5}" ry="${f.b*5}"/>`:`<rect x="${-f.a*5}" y="${-f.b*5}" width="${f.a*10}" height="${f.b*10}" rx="7"/>`;
   body+=`<g class="package" transform="translate(${x} ${y})"><g transform="rotate(${s.yaw_deg})" fill="${color}" fill-opacity="${copy===0?.13:.055}" stroke="${color}" stroke-opacity="${copy===0?.85:.35}" stroke-width="${copy===0?2.6:1.8}">${shape}${!f.round?`<line x1="${-f.a*5+8}" y1="${f.b*5-3}" x2="${f.a*5-8}" y2="${f.b*5-3}" stroke-width="4"/>`:''}</g><circle r="18" fill="${copy===0?'white':'#fafbfc'}" stroke="${color}" stroke-opacity="${copy===0?.5:.15}" stroke-width="1"/><text y="5" fill="${color}" fill-opacity="${copy===0?1:.45}" font-size="21" font-weight="600" text-anchor="middle">${n}</text></g>`;
  }
  body+='</g>';
 }
 return `<svg class="shelf-svg" viewBox="0 0 1240 640" role="img" aria-label="Вид полки сверху. Семь позиций, по три экземпляра в глубину."><rect x="5" y="37" width="1230" height="550" rx="10" fill="#fcfdfe" stroke="#e0e6ee" stroke-width="2"/>${body}<line x1="5" y1="587" x2="1235" y2="587" stroke="#a5b2c7" stroke-width="3"/>${PLAN.shelf.row_centers_cm.map(x=>`<text x="${x*10}" y="617" fill="#8794a8" font-size="20" text-anchor="middle">${x} см</text>`).join('')}</svg>`;
}
function productCard(s,n,i){
 if(n==null)return `<article class="product-card empty-card"><div class="product-top"><span class="position-number">Позиция ${i+1}</span><span>Центр ${PLAN.shelf.row_centers_cm[i]} см</span></div><div class="product-title">Пустая позиция</div><div class="product-footer">Не заполняйте её другим SKU</div></article>`;
 const p=products.get(n);
 return `<article class="product-card" data-sku="${n}" data-position="${i+1}"><div class="product-top"><span class="position-number">Позиция ${i+1} · № ${n}</span><span class="sku-id">SKU ${p.sku_id}</span></div><div class="product-name-label">Название SKU</div><h3 class="product-title"><button data-product="${n}" aria-label="Сведения о товаре ${esc(p.name)}">${esc(p.name)}</button></h3><div class="product-footer"><span class="angle-chip">↻ ${s.yaw_deg}°</span><span>3 шт. в глубину</span><span>Отступ ${s.front_setback_cm[i]} см</span><span>Центр ${PLAN.shelf.row_centers_cm[i]} см</span></div><button class="product-open" data-product="${n}" aria-label="Открыть SKU ${p.sku_id}">↗</button></article>`;
}
function renderDetail(){
 if(byId.get(selected).mode==='isolated'){renderIsolated(byId.get(selected));return;}
 const s=byId.get(selected),r=record(selected),seq=listForPhase(s),index=seq.findIndex(x=>x.id===selected),count=s.sku_order.filter(n=>n!=null).length;
 $('detail').innerHTML=`<div class="experiment-heading"><div><p class="eyebrow">ПЛАН СЪЁМКИ / ${s.series?'СЕРИЯ '+s.series:'ПУСТЫЕ ПОЛКИ'}</p><h1>${s.mode==='isolated'?esc(s.name):(s.series?`Набор ${s.series}${s.group}`:'Пустая полка')+' · '+SHELVES[s.shelf].toLowerCase()} полка</h1><div class="experiment-subtitle"><span class="phase-badge phase-${phase(s)}">${SERIES[phase(s)]}</span><span>${s.id}</span><span class="status-tag ${r.status}">${STATUS[r.status]}</span></div></div><div class="heading-actions"><button class="icon-button" data-navigate="previous" aria-label="Предыдущий эксперимент" ${index===0?'disabled':''}>←</button><button class="icon-button" data-navigate="next" aria-label="Следующий эксперимент" ${index===seq.length-1?'disabled':''}>→</button><button class="icon-button" data-action="print" aria-label="Печать карточки">⎙</button></div></div>
 <div class="metrics"><div class="metric"><div class="metric-label">Угол всех упаковок</div><div class="metric-value">${s.yaw_deg==null?'—':s.yaw_deg+'°'}<small>${s.yaw_deg==null?'пустая полка':'одинаковый'}</small></div></div><div class="metric"><div class="metric-label">Товары на полке</div><div class="metric-value">${count} SKU<small>× 3 шт.</small></div></div><div class="metric"><div class="metric-label">Расстояние камеры</div><div class="metric-value">17 → 20<small>см</small></div></div><div class="metric"><div class="metric-label">Отбор из одного проезда</div><div class="metric-value">28<small>кадров</small></div></div></div>
 <details class="shelf-details" ${matchMedia("(min-width: 1400px) and (min-height: 900px)").matches?"open":""}><summary class="section-header"><h2 id="shelf-title">Схема выкладки</h2><span>124 × 59 см · вид сверху <b class="disclosure-arrow">⌄</b></span></summary><div class="shelf-panel"><div class="shelf-topbar"><span>ЗАДНЯЯ СТЕНКА</span><b>Позиции слева направо →</b></div><div class="shelf-svg-wrap">${shelfDrawing(s)}</div><ol class="shelf-name-index" aria-label="Названия SKU по позициям">${s.sku_order.map((n,i)=>`<li><span>${i+1}</span><strong>${n?esc(products.get(n).name):"Пустая позиция"}</strong></li>`).join("")}</ol><div class="shelf-bottom"><span class="camera-symbol"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="7" width="18" height="13" rx="3"/><path d="M8 7l2-3h4l2 3"/><circle cx="12" cy="13" r="3"/></svg>КАМЕРА / ПЕРЕДНИЙ КРАЙ</span><div class="legend"><span><i></i>Передний экземпляр</span><span><i class="rear"></i>Два экземпляра за ним</span></div></div></div><p class="orientation-note">0° — лицевая сторона к камере. Поворачивайте все три экземпляра одинаково. Широкие стороны разрешены. Размеры на схеме номинальные; цифры внутри упаковок — номера SKU из плана.</p></details>
 <section class="products-section" aria-labelledby="products-title"><div class="section-header"><h2 id="products-title">Товары для этого эксперимента</h2><span>${count*3} шт.</span></div><div class="product-grid">${s.sku_order.map((n,i)=>productCard(s,n,i)).join('')}</div></section>
 <section class="protocol" aria-label="Порядок проезда"><div class="protocol-item"><b><span class="step-number">01</span> Старт вручную</b>Камера x = 6 см, расстояние 17 см. Платформа параллельно полке.</div><div class="protocol-item"><b><span class="step-number">02</span> Автоматический проезд</b>Две точки у каждого ряда: центр −4 см и +4 см. Пауза ≥1 с, отбор 0,6 с.</div><div class="protocol-item"><b><span class="step-number">03</span> Обратный проход</b>На x = 118 см отступить на 3 см. Вернуться на расстоянии 20 см.</div></section>
 <div id="capture-panel"></div><section class="journal-panel"><h2>Заметки к заданию</h2><label class="field">Имя сессии<input id="session-input" value="${esc(r.session)}" readonly placeholder="Формируется после записи"></label><label class="field">Заметки<textarea id="note-input" aria-label="Заметки" maxlength="4000">${esc(r.note)}</textarea></label><span id="saved-text" class="save-indicator">${savedText()}</span></section>
 <div class="page-bottom"><button class="button quiet" data-navigate="previous" ${index===0?'disabled':''}>← Предыдущий</button><span>${s.series?`Эксперимент ${s.order} из 60`:`Пустая полка ${s.shelf} из 3`} · ещё ${seq.slice(index+1).filter(x=>record(x.id).status!=='checked').length} впереди</span><button class="button" data-navigate="next" ${index===seq.length-1?'disabled':''}>Следующий эксперимент →</button></div><p class="print-only">${s.id} · расстояния 17 / 20 см · по 3 экземпляра · 28 выбранных кадров. 0° — лицевая сторона к камере. Имя записи: ${esc(r.session)||'не указано'}.</p>`;
 captureUI.mount(s);
 $('note-input').addEventListener('input',e=>setRecord({note:e.target.value}));
 document.querySelectorAll('.product-card[data-position]').forEach(card=>{const set=enabled=>document.querySelector(`.shelf-slot[data-position="${card.dataset.position}"]`)?.classList.toggle('slot-hover',enabled);card.addEventListener('mouseenter',()=>set(true));card.addEventListener('mouseleave',()=>set(false));card.addEventListener('focusin',()=>set(true));card.addEventListener('focusout',()=>set(false));});
 updateHighlights();
}
function render(){renderDetail();renderSidebar();}
function changeScene(id){if(!byId.has(id))return;selected=id;history.pushState(null,'','#'+id);render();$('sidebar').classList.remove('open');$('toggle-sidebar').setAttribute('aria-expanded','false');window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
function navigate(direction){const seq=listForPhase(byId.get(selected)),i=seq.findIndex(s=>s.id===selected),next=seq[i+(direction==='next'?1:-1)];if(next)changeScene(next.id);}
function showProduct(number){
 const p=products.get(number),s=byId.get(selected);if(!p)return;
 $('product-content').innerHTML=`<div class="dialog-header"><div><p class="eyebrow">ТОВАР № ${p.number} ИЗ ПЛАНА</p><h2 id="product-dialog-title">${esc(p.name)}</h2></div><button class="icon-button close-dialog" aria-label="Закрыть сведения о товаре">×</button></div><p class="sku-code-line">SKU ID: <strong>${p.sku_id}</strong></p><div class="product-info-table"><span>В этом эксперименте</span><strong>Позиция ${s.sku_order.indexOf(number)+1} · ${s.yaw_deg}° · 3 экземпляра</strong><span>Упаковка</span><strong>${esc(p.packaging_group)}</strong><span>Размеры из таблицы</span><strong>${p.dimensions_mm.join(' × ')} мм</strong><span>Ложемент</span><strong>${esc(p.holder)||'Не указан'}</strong></div><div class="dialog-product-footer"><a class="button primary" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Карточка ВкусВилла ↗</a><button class="button" data-copy-sku="${p.sku_id}">Скопировать SKU</button><button class="button quiet" data-find-sku="${p.sku_id}">Найти эксперименты</button></div>`;
 $('product-dialog').showModal();
}
function showJournal(){const t=totals();$('journal-summary').innerHTML=`<span><b>${t.done}</b>проверено из 60</span><span><b>${t.reshoot}</b>переснять</span><span><b>${t.empty}/3</b>пустых полок</span>`;$('journal-dialog').showModal();}
function download(content,type,name){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportJournal(kind){
 const stamp=new Date().toISOString().slice(0,10);
 if(kind==='json'){download(JSON.stringify({format:'yolo-shelf-journal',version:1,exportedAt:new Date().toISOString(),records},null,2),'application/json',`yolo-shelf-journal-${stamp}.json`);}
 else{
  const rows=[['Эпизод','Порядок','Серия','Полка','Статус','Угол, град','SKU слева направо','Названия товаров','Отступы, см','Имя записи','Заметки','Изменено']];
  for(const s of scenes){const r=record(s.id);rows.push([s.id,s.order??'',phase(s),SHELVES[s.shelf],STATUS[r.status],s.yaw_deg??'',s.sku_order.map(n=>n??'—').join(', '),s.sku_order.map(n=>n?products.get(n).name:'Пусто').join(' | '),s.front_setback_cm?.join(', ')??'',r.session,r.note,r.updatedAt??'']);}
  download('\uFEFF'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n'),'text/csv;charset=utf-8',`yolo-shelf-journal-${stamp}.csv`);
 }
 toast('Журнал скачан');
}
document.addEventListener('click',async e=>{
 const button=e.target.closest('button');if(!button||button.disabled)return;
 if(button.dataset.scene)changeScene(button.dataset.scene);
 if(button.dataset.navigate)navigate(button.dataset.navigate);
 if(button.dataset.product)showProduct(Number(button.dataset.product));
 if(button.dataset.series){series=button.dataset.series;renderSidebar();}
 if(button.dataset.status){setRecord({status:button.dataset.status});render();toast(button.dataset.status==='done'?'Эпизод отмечен как снятый':button.dataset.status==='reshoot'?'Эпизод отмечен для повторной съёмки':'Отметка снята');}
 if(button.classList.contains('close-dialog'))button.closest('dialog').close();
 if(button.dataset.copySku){try{await navigator.clipboard.writeText(button.dataset.copySku);toast('SKU скопирован');}catch{toast('SKU: '+button.dataset.copySku);}}
 if(button.dataset.findSku){$('product-dialog').close();search=button.dataset.findSku;series='all';shelf='all';status='all';$('search').value=search;$('shelf-filter').value='all';$('status-filter').value='all';renderSidebar();if(matchMedia('(max-width: 760px)').matches){$('sidebar').classList.add('open');$('toggle-sidebar').setAttribute('aria-expanded','true');}$('search').focus();}
 if(button.dataset.action==='print'){const diagram=document.querySelector('.shelf-details'),opened=diagram.open;diagram.open=true;window.print();diagram.open=opened;}
});
$('search').addEventListener('input',e=>{search=e.target.value;renderSidebar();});
$('shelf-filter').addEventListener('change',e=>{shelf=e.target.value;renderSidebar();});
$('status-filter').addEventListener('change',e=>{status=e.target.value;renderSidebar();});
$('toggle-sidebar').addEventListener('click',()=>{const open=$('sidebar').classList.toggle('open');$('toggle-sidebar').setAttribute('aria-expanded',String(open));});
$('open-journal').addEventListener('click',showJournal);
$('export-csv').addEventListener('click',()=>exportJournal('csv'));
$('export-json').addEventListener('click',()=>exportJournal('json'));
$('import-file').addEventListener('change',async e=>{
 const file=e.target.files[0];if(!file)return;
 try{if(file.size>1_000_000)throw new Error('Файл слишком большой');const input=JSON.parse(await file.text());if(input.format!=='yolo-shelf-journal'||input.version!==1)throw new Error('Неизвестный формат резервной копии');const next=cleanRecords(input.records,validIds);if(!Object.keys(next).length)throw new Error('Нет записей известных экспериментов');for(const [id,r]of Object.entries(next))sync.edit(id,{note:r.note,session:r.session});render();$('journal-dialog').close();toast(`Восстановлено записей: ${Object.keys(next).length}`);}catch(error){toast('Импорт не выполнен: '+error.message);}finally{e.target.value='';}
});
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',e=>{if(e.target===dialog){const box=dialog.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)dialog.close();}});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();if(matchMedia('(max-width:760px)').matches){$('sidebar').classList.add('open');$('toggle-sidebar').setAttribute('aria-expanded','true');}$('search').focus();}if(e.key==='Escape'){$('sidebar').classList.remove('open');$('toggle-sidebar').setAttribute('aria-expanded','false');}});
window.addEventListener('popstate',()=>{const id=decodeURIComponent(location.hash.slice(1));if(byId.has(id)){selected=id;render();}});
window.addEventListener('hashchange',()=>{const id=decodeURIComponent(location.hash.slice(1));if(byId.has(id)&&id!==selected){selected=id;render();}});
function renderIsolated(s){const r=record(s.id);$('detail').innerHTML=`<div class="experiment-heading"><div><p class="eyebrow">ОДИНОЧНЫЙ SKU / ПОЛУСИНТЕТИКА</p><h1>${esc(s.name)}</h1><p>SKU ${s.sku_id} · 1 экземпляр · 12 физических ракурсов</p><span class="status-tag ${r.status}">${STATUS[r.status]}</span></div></div><div class="isolated-card">${s.photo_url?`<img class="product-reference" src="${esc(s.photo_url)}" alt="Фото упаковки ${esc(s.name)}" referrerpolicy="no-referrer">`:''}<div><h2>Сверьте упаковку</h2><p>${esc(s.name)}</p><p>${esc(s.packaging_group)} · размеры ${s.dimensions_mm.join(' × ')} мм</p><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">Карточка товара ↗</a><p>Сверьте название, массу или объём, разновидность и внешний вид. Если упаковка отличается — сообщите о проблеме.</p></div></div><div class="yaw-steps">${PLAN.isolated_yaws_deg.map((x,i)=>`<span>${i+1}. ${x}°</span>`).join('')}</div><div id="capture-panel"></div><section class="journal-panel"><label class="field">Заметки<textarea id="note-input" aria-label="Заметки" maxlength="4000">${esc(r.note)}</textarea></label><span id="saved-text">${savedText()}</span></section>`;$('note-input').addEventListener('input',e=>setRecord({note:e.target.value}));captureUI.mount(s);}
const sync=new JournalSync({storage:localStorage,validIds,legacy:records,onChange:()=>{records=sync.records();renderSidebar();$('sync-label').textContent=sync.label();$('sync-footer').textContent=sync.label();const saved=$('saved-text');if(saved)saved.textContent=sync.label();if(!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)&&!document.querySelector('dialog[open]'))renderDetail();updateSyncDialog();}});
const captureUI=new CaptureUI({sync,getRecord:record,toast});
function updateSyncDialog(){ $('sync-state').textContent=sync.label();$('disconnect-sync').hidden=!sync.token;$('conflict-list').innerHTML=Object.entries(sync.conflicts).map(([k,r])=>`<article class="sync-conflict"><b>${esc(r.scene_id)} · ${esc(r.field)}</b><details><summary>Сравнить версии</summary><p>Сервер: ${esc(r.value)}</p><p>Устройство: ${esc(sync.pending[k]?.value??'')}</p></details><button class="button" data-conflict="${esc(k)}" data-resolution="remote">Оставить с сервера</button> <button class="button" data-conflict="${esc(k)}" data-resolution="local">Сохранить мою версию</button></article>`).join('');}
$('open-sync').addEventListener('click',()=>{updateSyncDialog();$('sync-dialog').showModal();});
$('connect-form').addEventListener('submit',async e=>{e.preventDefault();$('connect-submit').disabled=true;try{await sync.connect($('team-code').value);$('team-code').value='';$('connect-error').textContent='';toast('Общий журнал подключён');}catch(err){sync.connected=false;sync.token='';$('connect-error').textContent=err.message;sync.persist();}finally{$('connect-submit').disabled=false;}});
$('disconnect-sync').addEventListener('click',()=>sync.disconnect());$('refresh-sync').addEventListener('click',()=>sync.sync());
document.addEventListener('click',e=>{const b=e.target.closest('[data-conflict]');if(b)sync.resolve(b.dataset.conflict,b.dataset.resolution==='local');});
window.addEventListener('online',()=>sync.sync());window.addEventListener('offline',()=>{sync.connected=false;sync.message='Нет связи · изменения на устройстве';sync.persist();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync.sync();});
setInterval(()=>{if(!document.hidden)sync.sync();},8000);
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('close',()=>render());
history.replaceState(null,'','#'+selected);render();sync.persist();
if(sync.token)sync.connect(sync.token).catch(()=>{sync.connected=false;sync.message='Нет связи или неверный код команды';sync.persist();});
