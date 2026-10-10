export const PROBLEMS=['Товар отсутствует','Упаковка отличается от фотографии','Не могу уверенно определить товар','Камера не показывает изображение','Не получается получить резкий кадр','Не получается выполнить шаг или движение','Другая причина'];
export function parse(value,fallback={}){try{return JSON.parse(value)||fallback;}catch{return fallback;}}
export function taskCount(task){return task.mode==='isolated'?12:28;}
export function canCheck(capture,review,count){return capture?.complete===true&&capture.frames?.length===count&&new Set(capture.frames.map(f=>f.id)).size===count&&review.sessionId===capture.sessionId&&capture.frames.every(f=>review.decisions?.[f.id]?.decision==='accepted'&&review.decisions[f.id].imageKey===f.imageKey);}
export function validateCapture(c,task){
 const n=taskCount(task);if(!c||c.sceneId!==task.id||typeof c.sessionId!=='string'||!/^[-a-zA-Z0-9_]{8,100}$/.test(c.sessionId)||c.frames?.length>n||!c.frames?.length)throw new Error('Сессия не соответствует заданию');
 if(new Set(c.frames.map(f=>f.id)).size!==c.frames.length)throw new Error('Повторяющиеся шаги');
 for(const f of c.frames)if(!/^[-a-zA-Z0-9_]{1,80}$/.test(f.id)||!/^frames\/[a-f0-9]{64}\.(png|jpg)$/.test(f.imageKey)||!Number.isInteger(f.step)||f.step<1||f.step>n||!f.sha256||!Number.isInteger(f.bytes)||f.bytes<10)throw new Error('Некорректные сведения о кадре');
 if(new Set(c.frames.map(f=>f.step)).size!==c.frames.length)throw new Error('Повторяющиеся номера шагов');
 if(task.mode==='isolated'&&c.frames.some(f=>f.yaw!==(f.step-1)*30))throw new Error('Ракурс не соответствует шагу');
 return {...c,complete:c.complete===true&&c.frames.length===n,expectedCount:n};
}
export function buildFolderCapture(task,manifest,files){
 const source=manifest.frames??[];if(manifest.scene?.id&&manifest.scene.id!==task.id)throw new Error('Выбрана папка другого эксперимента');
 if(manifest.sceneId&&manifest.sceneId!==task.id)throw new Error('Выбрана папка другого задания');
 if(task.mode==='isolated'&&manifest.skuId!==task.sku_id)throw new Error('SKU в папке не совпадает');
 if(!source.length)throw new Error('В манифесте нет сохранённых кадров');
 const n=taskCount(task);if(source.length>n)throw new Error('Слишком много кадров');
 return source.map((f,i)=>{const name=(f.file??'').replaceAll('\\','/');if(!name||name.split('/').includes('..')||name.startsWith('/'))throw new Error('Неверный путь кадра');const file=files.find(x=>x.relative===name);if(!file)throw new Error('Не найден файл: '+name);return {source:f,file:file.file,step:f.step??i+1,yaw:f.yaw??f.target_yaw_deg??task.yaw_deg??i*30};});
}
