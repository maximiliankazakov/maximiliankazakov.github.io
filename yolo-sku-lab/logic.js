export const STATUS = {planned:'Не начато',collecting:'Сбор',captured:'Записано',checked:'Проверено',needs_review:'Нужна проверка',reshoot:'Переснять',done:'Прежняя отметка'};
export const SHELVES = {1:'Верхняя',2:'Средняя',3:'Нижняя'};
export const SERIES = {A:'Основные данные',B:'Похожие упаковки',C:'Настройка и поиск ошибок',D:'Финальная проверка',empty:'Пустая полка',isolated:'Одиночные SKU'};
export function normalize(value){return String(value??'').toLowerCase().replaceAll('ё','е').trim();}
export function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function productMatches(p,query){
 const q=normalize(query);if(!q)return false;
 if(/^\d+$/.test(q)){return Number(q)<=34?String(p.number)===q:p.sku_id.includes(q);}
 const hay=normalize(`${p.name} ${p.sku_id} SKU ${p.number}`);
 return q.split(/\s+/).every(word=>hay.includes(word));
}
export function sceneMatches(scene,query,byNumber){
 const q=normalize(query);if(!q)return true;
 if(normalize(scene.id).includes(q)||normalize(`${scene.series??'empty'}${scene.group??''} ${SHELVES[scene.shelf]}`).includes(q))return true;
 return scene.sku_order.some(n=>n!=null&&productMatches(byNumber.get(n),q));
}
export function footprint(product,yaw){
 const a=product.dimensions_mm[0]/10,b=product.dimensions_mm[1]/10,r=yaw*Math.PI/180;
 const round=/банка|бутыл|стакан|аэрозоль|фигурн/i.test(product.packaging_group);
 return {a,b,round,width:round?Math.hypot(a*Math.cos(r),b*Math.sin(r)):Math.abs(a*Math.cos(r))+Math.abs(b*Math.sin(r)),
 depth:round?Math.hypot(a*Math.sin(r),b*Math.cos(r)):Math.abs(a*Math.sin(r))+Math.abs(b*Math.cos(r))};
}
export function cleanRecords(input,validIds){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Файл не содержит журнал экспериментов');
 const result=Object.create(null);
 for(const [id,v] of Object.entries(input)){
  if(!validIds.has(id)||!v||typeof v!=='object'||!Object.hasOwn(STATUS,v.status))continue;
  result[id]={status:v.status,note:typeof v.note==='string'?v.note.slice(0,4000):'',session:typeof v.session==='string'?v.session.slice(0,120):'',updatedAt:typeof v.updatedAt==='string'&&!Number.isNaN(Date.parse(v.updatedAt))?v.updatedAt:null};
 }
 return result;
}
export function csvCell(value){const text=String(value??'');return '"'+(/^[=+\-@\t\r]/.test(text)?"'"+text:text).replaceAll('"','""')+'"';}
