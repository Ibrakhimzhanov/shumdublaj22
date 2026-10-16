/* Строки экрана создания голоса по текстовому описанию. */

export default {
  ru: {
    /* служебное */
    queuePos: 'В очереди: {n}',
    sec: '{n} сек.',
    failGeneric: 'Сервис не смог выполнить задачу.',
    cancelledGeneric: 'Задача отменена.',
    errServiceGeneric: 'Сервис ответил ошибкой',

    /* свои проверки и уведомления */
    errNoJobOptions: 'Сервис принял описание, но не вернул задачу создания вариантов. Повторите попытку.',
    errBadFormat: 'Сервис вернул варианты в неизвестном формате. Сообщите в поддержку.',
    errNoPreview: 'Сервис не отдал пример варианта.',
    errPreviewRead: 'Не удалось прочитать пример варианта.',
    errNoJobSave: 'Сервис принял выбор, но не вернул задачу сохранения. Повторите попытку.',
    toastLimit: 'Лимит голосов исчерпан',
    toastVariantsFail: 'Варианты не созданы',
    toastVariantsCancelled: 'Создание вариантов отменено',
    toastPreviewFail: 'Пример не загрузился',
    toastSaveFail: 'Голос не сохранён',
    toastSaveCancelled: 'Сохранение отменено',
    toastSaved: 'Голос «{name}» создан по описанию',

    /* экран без подписки */
    lockedTitle: 'Голос по описанию - по подписке',
    lockedText: 'Опишите характер голоса словами - получите три варианта на выбор. Доступно вместе с клонированием и безлимитной озвучкой.',
    lockedBtn: 'Оформить подписку в боте',

    /* форма */
    title: 'Голос по описанию',
    subtitle: 'Опишите характер - получите три варианта и выберите лучший.',
    nameLabel: 'Название',
    countMin: '{n} / {max} (мин. {min})',
    namePlaceholder: 'Например: Рассказчик для сказок',
    textLabel: 'Описание голоса',
    textPlaceholder: 'Мужской голос средних лет, тёплый и низкий, говорит неторопливо, с лёгкой хрипотцой…',
    resetWarn: 'Изменение названия или описания сбросит полученные варианты.',
    btnGenerate: 'Создать варианты',

    /* правая колонка */
    limitFallback: 'Лимит голосов исчерпан.',
    limitHint: 'Это не поломка - удалите неиспользуемый голос в библиотеке или расширьте тариф в боте.',
    busyLine1: 'Генерируем три варианта голоса.',
    busyLine2: 'Обычно это занимает 1-2 минуты.',

    /* варианты */
    variantTitle: 'Вариант {n}',
    variantSub: 'Интерпретация описания №{n} - прослушайте пример',
    variantSubDur: 'Интерпретация описания №{n} - прослушайте пример ({d})',
    previewLoading: 'Загружаем…',
    previewPause: 'Пауза',
    previewPlay: 'Прослушать пример',
    btnRegen: 'Другие три варианта',
    btnSave: 'Сохранить выбранный',
    btnSaving: 'Сохраняем…',

    /* пустое состояние */
    idleLine1: 'Здесь появятся три варианта голоса -',
    idleLine2: 'заполните описание слева и запустите.'
  },

  uz: {
    /* служебное */
    queuePos: 'Navbatda: {n}',
    sec: '{n} soniya',
    failGeneric: 'Xizmat vazifani bajara olmadi.',
    cancelledGeneric: 'Vazifa bekor qilindi.',
    errServiceGeneric: 'Xizmat xatolik qaytardi',

    /* свои проверки и уведомления */
    errNoJobOptions: 'Xizmat tavsifni qabul qildi, lekin variantlar yaratish vazifasini qaytarmadi. Qaytadan urinib ko‘ring.',
    errBadFormat: 'Xizmat variantlarni notanish formatda qaytardi. Yordam xizmatiga xabar bering.',
    errNoPreview: 'Xizmat variant namunasini bermadi.',
    errPreviewRead: 'Variant namunasini o‘qib bo‘lmadi.',
    errNoJobSave: 'Xizmat tanlovni qabul qildi, lekin saqlash vazifasini qaytarmadi. Qaytadan urinib ko‘ring.',
    toastLimit: 'Ovozlar limiti tugadi',
    toastVariantsFail: 'Variantlar yaratilmadi',
    toastVariantsCancelled: 'Variantlar yaratish bekor qilindi',
    toastPreviewFail: 'Namuna yuklanmadi',
    toastSaveFail: 'Ovoz saqlanmadi',
    toastSaveCancelled: 'Saqlash bekor qilindi',
    toastSaved: '«{name}» ovozi tavsif bo‘yicha yaratildi',

    /* экран без подписки */
    lockedTitle: 'Tavsif bo‘yicha ovoz - obuna bilan',
    lockedText: 'Ovoz xarakterini so‘z bilan tasvirlang, tanlash uchun uchta variant olasiz. Nusxalash va cheksiz ovozlashtirish bilan birga ochiladi.',
    lockedBtn: 'Botda obuna rasmiylashtirish',

    /* форма */
    title: 'Tavsif bo‘yicha ovoz',
    subtitle: 'Xarakterni tasvirlang, uchta variant olib, eng yaxshisini tanlang.',
    nameLabel: 'Nomi',
    countMin: '{n} / {max} (kamida {min})',
    namePlaceholder: 'Masalan: Ertaklar uchun hikoyachi',
    textLabel: 'Ovoz tavsifi',
    textPlaceholder: 'O‘rta yoshli erkak ovozi, iliq va past, shoshilmay gapiradi, ozgina xirillaydi…',
    resetWarn: 'Nom yoki tavsifni o‘zgartirsangiz, olingan variantlar bekor bo‘ladi.',
    btnGenerate: 'Variantlar yaratish',

    /* правая колонка */
    limitFallback: 'Ovozlar limiti tugadi.',
    limitHint: 'Bu nosozlik emas: kutubxonadan ishlatilmayotgan ovozni o‘chiring yoki botda tarifni kengaytiring.',
    busyLine1: 'Uchta ovoz varianti yaratilmoqda.',
    busyLine2: 'Odatda bu 1-2 daqiqa oladi.',

    /* варианты */
    variantTitle: '{n}-variant',
    variantSub: 'Tavsifning {n}-talqini - namunani tinglang',
    variantSubDur: 'Tavsifning {n}-talqini - namunani tinglang ({d})',
    previewLoading: 'Yuklanmoqda…',
    previewPause: 'Pauza',
    previewPlay: 'Namunani tinglash',
    btnRegen: 'Yana uchta variant',
    btnSave: 'Tanlanganini saqlash',
    btnSaving: 'Saqlanmoqda…',

    /* пустое состояние */
    idleLine1: 'Bu yerda uchta ovoz varianti paydo bo‘ladi -',
    idleLine2: 'chapdagi tavsifni to‘ldirib, ishga tushiring.'
  }
};
