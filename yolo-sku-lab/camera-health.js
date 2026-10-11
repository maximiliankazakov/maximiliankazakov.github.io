export function cameraPresentation(s,{connected=false,stateAge=Infinity,previewAge=Infinity,hasFrame=false,viewOpen=false,previewFailed=false}={}){
 if(!connected)return {tone:'neutral',label:'Камера не подключена',detail:'Подключите локальный сервис просмотра. Это не запускает запись или движение.'};
 if(!s||stateAge>2500)return {tone:'bad',label:'Связь с камерой потеряна',detail:'Не ориентируйтесь на последний кадр: состояние камеры сейчас неизвестно.'};
 if(s.cameraError)return {tone:'bad',label:'Ошибка камеры',detail:s.cameraError};
 if(!s.cameraFresh)return {tone:'bad',label:(s.cameraFrameCount||hasFrame)?'Кадры перестали поступать':'Нет изображения',detail:(s.cameraFrameCount||hasFrame)?'Последний кадр устарел. Проверьте камеру и её подключение.':'Сервис отвечает, но камера ещё не прислала ни одного кадра.'};
 if(viewOpen&&(previewFailed||(hasFrame&&previewAge>2500)))return {tone:'bad',label:'Просмотр не обновляется',detail:'Источник камеры отвечает, но свежий кадр не удалось показать в браузере.'};
 if(viewOpen&&!hasFrame)return {tone:'waiting',label:'Загружаем изображение',detail:'Камера присылает кадры. Ожидаем изображение для просмотра.'};
 return {tone:'good',label:'Камера работает',detail:'Поступают свежие кадры. Просмотр сам по себе не проверяет запись данных и остальные части программы.'};
}
