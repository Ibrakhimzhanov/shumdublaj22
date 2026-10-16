/* Строки экрана клонирования голоса. */

export default {
  ru: {
    /* служебное */
    queuePos: 'В очереди: {n}',
    mb: 'МБ',
    failGeneric: 'Сервис не смог создать голос.',
    cancelledGeneric: 'Создание голоса отменено.',
    errServiceGeneric: 'Сервис ответил ошибкой',

    /* свои проверки и уведомления */
    errNoPath: 'Не удалось прочитать путь файла. Выберите файл кнопкой.',
    errTooBig: 'Файл больше 10 МБ. Загрузите запись покороче.',
    errNoJob: 'Сервис принял файл, но не вернул задачу создания. Повторите попытку.',
    toastLimit: 'Лимит клонированных голосов исчерпан',
    toastFail: 'Голос не создан',
    toastCancelled: 'Создание голоса отменено',
    toastCreated: 'Голос «{name}» создан',

    /* экран без подписки */
    lockedTitle: 'Клонирование - по подписке',
    lockedText: 'Подписка открывает клонирование по образцу записи, создание голосов по описанию и безлимитную озвучку без списания символов.',
    lockedBtn: 'Оформить подписку в боте',

    /* форма */
    title: 'Клонировать голос',
    subtitle: 'Загрузите чистую запись 30-60 секунд - получите голос, который звучит как образец.',
    nameLabel: 'Название голоса',
    nameCount: '{n} / 40',
    namePlaceholder: 'Например: Мой голос - подкаст',
    limitHint: 'Это не поломка - удалите неиспользуемый голос в библиотеке или расширьте тариф в боте.',
    btnStart: 'Клонировать голос',
    btnBusy: 'Создаём голос…',
    busyHint: 'Создание голоса может занять пару минут - не закрывайте приложение.',

    /* зона перетаскивания и карточка файла */
    dropRelease: 'Отпустите файл здесь',
    dropHere: 'Перетащите аудиофайл сюда',
    dropFormats: 'MP3, WAV, M4A, OGG · до 10 МБ · или выберите кнопкой',
    dropPick: 'Выбрать файл',
    fileSample: 'Образец записи',
    fileReplace: 'Заменить',
    fileRemove: 'Убрать файл'
  },

  uz: {
    /* служебное */
    queuePos: 'Navbatda: {n}',
    mb: 'MB',
    failGeneric: 'Xizmat ovozni yarata olmadi.',
    cancelledGeneric: 'Ovoz yaratish bekor qilindi.',
    errServiceGeneric: 'Xizmat xatolik qaytardi',

    /* свои проверки и уведомления */
    errNoPath: 'Fayl manzilini o‘qib bo‘lmadi. Faylni tugma orqali tanlang.',
    errTooBig: 'Fayl 10 MB dan katta. Qisqaroq yozuvni yuklang.',
    errNoJob: 'Xizmat faylni qabul qildi, lekin yaratish vazifasini qaytarmadi. Qaytadan urinib ko‘ring.',
    toastLimit: 'Nusxalangan ovozlar limiti tugadi',
    toastFail: 'Ovoz yaratilmadi',
    toastCancelled: 'Ovoz yaratish bekor qilindi',
    toastCreated: '«{name}» ovozi yaratildi',

    /* экран без подписки */
    lockedTitle: 'Nusxalash - obuna bilan',
    lockedText: 'Obuna yozuv namunasi bo‘yicha nusxalashni, tavsif bo‘yicha ovoz yaratishni va belgilar yechilmaydigan cheksiz ovozlashtirishni ochadi.',
    lockedBtn: 'Botda obuna rasmiylashtirish',

    /* форма */
    title: 'Ovozni nusxalash',
    subtitle: '30-60 soniyalik toza yozuvni yuklang, namunadek yangraydigan ovoz olasiz.',
    nameLabel: 'Ovoz nomi',
    nameCount: '{n} / 40',
    namePlaceholder: 'Masalan: Mening ovozim - podkast',
    limitHint: 'Bu nosozlik emas: kutubxonadan ishlatilmayotgan ovozni o‘chiring yoki botda tarifni kengaytiring.',
    btnStart: 'Ovozni nusxalash',
    btnBusy: 'Ovoz yaratilmoqda…',
    busyHint: 'Ovoz yaratish bir necha daqiqa olishi mumkin, ilovani yopmang.',

    /* зона перетаскивания и карточка файла */
    dropRelease: 'Faylni shu yerga qo‘yib yuboring',
    dropHere: 'Audio faylni shu yerga tashlang',
    dropFormats: 'MP3, WAV, M4A, OGG · 10 MB gacha · yoki tugma orqali tanlang',
    dropPick: 'Faylni tanlash',
    fileSample: 'Yozuv namunasi',
    fileReplace: 'Almashtirish',
    fileRemove: 'Faylni olib tashlash'
  }
};
