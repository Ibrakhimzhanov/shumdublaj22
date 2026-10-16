/* Строки экрана задач: вкладки «Результат» и «История».
   Тексты ошибок, пришедшие от сервиса, сюда не попадают: они показываются
   как есть, здесь только наши собственные подписи вокруг них. */

export default {
  ru: {
    /* вкладки и шапка */
    tabResult: 'Результат',
    tabHistory: 'История · {n}',
    stopBtn: 'Остановить',

    /* история */
    clearFinished: 'Очистить завершённые',
    histEmpty1: 'Пока пусто. Запустите первую озвучку -',
    histEmpty2: 'она появится здесь.',
    dlOneTitle: 'Скачать результат',
    dlZip: 'Скачать архивом',
    deleteBtn: 'Удалить',

    /* пустой результат */
    resEmpty1: 'Здесь появится результат озвучки.',
    resEmpty2: 'Вставьте текст слева и нажмите «Озвучить».',

    /* карточка задачи */
    taskNo: 'Озвучка № {n}',
    taskFallback: 'Озвучка',
    created: 'Создана: {date}',
    sourceText: 'Исходный текст',
    overall: 'Общий результат',
    doneOf: 'сделано {done} из {total}',
    etaWait: 'оценка появится после первой части',
    stepPart: 'Озвучиваем часть {n} из {total}',
    stepPartVoice: 'Озвучиваем часть {n} из {total} голосом «{voice}»',
    queueing: 'Собираем очередь…',
    partErrHint: 'Часть завершилась ошибкой - остальные продолжаются, её можно перезапустить ниже.',
    cancelledDone: 'Остановлено - готово {done} из {total} {w}',
    noErrReason: 'Сервис не сообщил причину ошибки.',
    readyDownload: 'Озвучка готова - скачайте результат',
    liveNote: 'Запись продолжается - доступно {n} {w} из {total}, воспроизведение не прервётся',
    dlOne: 'Скачать одним файлом',

    /* части */
    partsCap: 'Части · {n}',
    loadingParts: 'Загружаем список частей…',
    partN: 'Часть {n}',
    retry: 'Перезапустить',
    retrying: 'Перезапускаем…',
    partRestarted: 'Часть {n} перезапущена',

    /* статусы */
    stRunning: 'идёт',
    stQueued: 'в очереди',
    stDone: 'готово',
    stError: 'ошибка',
    stCancelled: 'остановлено',
    partCancelled: 'остановлена',

    /* слово «часть» в разных падежах для русского счёта */
    partsGenOne: 'части',
    partsGenMany: 'частей',
    partsNomOne: 'часть',
    partsNomFew: 'части',
    partsNomMany: 'частей',

    /* подтверждения */
    stopTitle: 'Остановить озвучку?',
    stopSub: 'Уже готовые части останутся доступными. Действие нельзя отменить.',
    stoppedToast: 'Озвучка остановлена',
    delTitle: 'Удалить озвучку?',
    delSub: '«{name}» и её аудио будут удалены безвозвратно.',
    deletedToast: 'Озвучка удалена',
    clearTitle: 'Очистить завершённые?',
    clearSub: 'Будут удалены все готовые, остановленные и завершившиеся с ошибкой озвучки. Действие необратимо.',
    clearAct: 'Очистить',
    clearedToast: 'История очищена',

    /* скачивание */
    saveNoReason: 'Сервис не сообщил причину отказа.',
    savePartial: 'Файл сохранён не полностью: получено {got} из {exp} байт. Повторите скачивание.',
    zipPartial: 'Архив скачан не полностью: части {list} не попали в него. Перезапустите их и повторите.',
    saveOk: 'Файл сохранён: {path}',
    noFileLink: 'Сервис не дал ссылку на готовый файл этой озвучки.',
    noReadyParts: 'Готовых частей нет: архив собирать не из чего.',

    /* связь */
    connLostNote: 'Связь потеряна - повторяем запрос. Готовые части доступны.'
  },

  uz: {
    /* вкладки и шапка */
    tabResult: 'Natija',
    tabHistory: 'Tarix · {n}',
    stopBtn: 'To‘xtatish',

    /* история */
    clearFinished: 'Tugaganlarni tozalash',
    histEmpty1: 'Hozircha bo‘sh. Birinchi ovozlashtirishni ishga tushiring -',
    histEmpty2: 'u shu yerda paydo bo‘ladi.',
    dlOneTitle: 'Natijani yuklab olish',
    dlZip: 'Arxiv qilib yuklab olish',
    deleteBtn: 'O‘chirish',

    /* пустой результат */
    resEmpty1: 'Ovozlashtirish natijasi shu yerda ko‘rinadi.',
    resEmpty2: 'Chapga matnni qo‘ying va «Ovozlashtirish» tugmasini bosing.',

    /* карточка задачи */
    taskNo: 'Ovozlashtirish № {n}',
    taskFallback: 'Ovozlashtirish',
    created: 'Yaratilgan: {date}',
    sourceText: 'Asl matn',
    overall: 'Umumiy natija',
    doneOf: '{total} tadan {done} tasi tayyor',
    etaWait: 'taxminiy vaqt birinchi qismdan keyin ko‘rinadi',
    stepPart: '{total} qismdan {n}-qismi ovozlashtirilmoqda',
    stepPartVoice: '{total} qismdan {n}-qismi «{voice}» ovozida ovozlashtirilmoqda',
    queueing: 'Navbat tayyorlanmoqda…',
    partErrHint: 'Bir qism xato bilan tugadi - qolganlari davom etmoqda, uni quyida qayta ishga tushirsa bo‘ladi.',
    cancelledDone: 'To‘xtatildi - {total} qismdan {done} tasi tayyor',
    noErrReason: 'Xizmat xato sababini bildirmadi.',
    readyDownload: 'Ovozlashtirish tayyor - natijani yuklab oling',
    liveNote: 'Yozuv davom etmoqda - {total} qismdan {n} tasi tayyor, ijro to‘xtamaydi',
    dlOne: 'Bitta fayl qilib yuklab olish',

    /* части */
    partsCap: 'Qismlar · {n}',
    loadingParts: 'Qismlar ro‘yxati yuklanmoqda…',
    partN: '{n}-qism',
    retry: 'Qayta ishga tushirish',
    retrying: 'Qayta ishga tushirilmoqda…',
    partRestarted: '{n}-qism qayta ishga tushirildi',

    /* статусы */
    stRunning: 'bajarilmoqda',
    stQueued: 'navbatda',
    stDone: 'tayyor',
    stError: 'xato',
    stCancelled: 'to‘xtatilgan',
    partCancelled: 'to‘xtatilgan',

    /* в узбекском счётное слово не меняется, но ключи нужны все */
    partsGenOne: 'qism',
    partsGenMany: 'qism',
    partsNomOne: 'qism',
    partsNomFew: 'qism',
    partsNomMany: 'qism',

    /* подтверждения */
    stopTitle: 'Ovozlashtirish to‘xtatilsinmi?',
    stopSub: 'Tayyor bo‘lgan qismlar saqlanib qoladi. Bu amalni ortga qaytarib bo‘lmaydi.',
    stoppedToast: 'Ovozlashtirish to‘xtatildi',
    delTitle: 'Ovozlashtirish o‘chirilsinmi?',
    delSub: '«{name}» va uning audiosi butunlay o‘chiriladi.',
    deletedToast: 'Ovozlashtirish o‘chirildi',
    clearTitle: 'Tugaganlar tozalansinmi?',
    clearSub: 'Barcha tayyor, to‘xtatilgan va xato bilan tugagan ovozlashtirishlar o‘chiriladi. Amalni ortga qaytarib bo‘lmaydi.',
    clearAct: 'Tozalash',
    clearedToast: 'Tarix tozalandi',

    /* скачивание */
    saveNoReason: 'Xizmat rad etish sababini bildirmadi.',
    savePartial: 'Fayl to‘liq saqlanmadi: {exp} baytdan {got} tasi olindi. Yuklashni qaytadan bajaring.',
    zipPartial: 'Arxiv to‘liq yuklanmadi: {list} qismlar unga tushmadi. Ularni qayta ishga tushiring va yana urinib ko‘ring.',
    saveOk: 'Fayl saqlandi: {path}',
    noFileLink: 'Xizmat bu ovozlashtirishning tayyor fayliga havola bermadi.',
    noReadyParts: 'Tayyor qismlar yo‘q: arxiv yig‘ish uchun hech narsa yo‘q.',

    /* связь */
    connLostNote: 'Aloqa uzildi - so‘rov qayta yuborilmoqda. Tayyor qismlar ochiq.'
  }
};
