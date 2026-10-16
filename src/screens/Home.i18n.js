/* Строки экрана озвучки. */

export default {
  ru: {
    greet: 'Привет, {name}!',
    friend: 'друг',

    subActive: 'Подписка активна: озвучивайте без лимитов.',
    subDemoEmpty: 'Демо-режим: бесплатные символы закончились.',
    subDemo: 'Демо-режим: осталось {left} бесплатных символов.',

    chipVoice: 'Голос: {name}',
    chipNoVoice: 'Голос не выбран',
    chipSettings: 'Настройки озвучки',

    blockNoVoiceTitle: 'Голос не выбран',
    blockNoVoiceSub: 'Выберите голос в библиотеке: без него озвучка не запустится.',
    blockNoVoiceAct: 'Выбрать голос',

    blockNoCharsTitle: 'Бесплатные символы закончились',
    blockNoCharsSub: 'Свободный лимит израсходован полностью. Подписка снимает ограничение.',
    blockBuyAct: 'Оформить в боте',

    blockShortTitle: 'Не хватит символов',
    blockShortSub: 'В тексте {cost} символов, осталось {left}. Сократите текст или оформите подписку.',

    fileNote: 'Файл с текстом · будет озвучен целиком',
    fileRemove: 'Убрать файл',
    filePick: 'Выбрать файл с текстом',
    textPlaceholder: 'Вставьте текст для озвучки…',

    errFileTooBig: 'Файл больше 40 МБ. Разбейте его на части.',
    errFilePath: 'Не удалось прочитать путь файла. Попробуйте выбрать его ещё раз.',

    okArchive: 'Архив принят. Создано задач: {n}, каждая появится в истории.',
    okStarted: 'Озвучка запущена.',

    costUnlimited: 'Безлимит: символы не списываются',
    costFile: 'Объём файла сервис посчитает при загрузке · осталось {left}',
    costText: 'Спишется ≈ {cost} симв. · осталось {left}',

    running: 'Запускаем…',
    run: 'Озвучить',

    formats: 'Форматы: TXT, MD, SRT, DOCX, ZIP - из архива получится несколько задач'
  },

  uz: {
    greet: 'Salom, {name}!',
    friend: 'do‘st',

    subActive: 'Obuna faol: cheklovsiz ovozlashtiravering.',
    subDemoEmpty: 'Demo rejim: bepul belgilar tugadi.',
    subDemo: 'Demo rejim: {left} ta bepul belgi qoldi.',

    chipVoice: 'Ovoz: {name}',
    chipNoVoice: 'Ovoz tanlanmagan',
    chipSettings: 'Ovozlashtirish sozlamalari',

    blockNoVoiceTitle: 'Ovoz tanlanmagan',
    blockNoVoiceSub: 'Kutubxonadan ovoz tanlang: ovozsiz ovozlashtirish boshlanmaydi.',
    blockNoVoiceAct: 'Ovoz tanlash',

    blockNoCharsTitle: 'Bepul belgilar tugadi',
    blockNoCharsSub: 'Bepul limit to‘liq sarflandi. Obuna bu cheklovni olib tashlaydi.',
    blockBuyAct: 'Botda rasmiylashtirish',

    blockShortTitle: 'Belgilar yetmaydi',
    blockShortSub: 'Matnda {cost} ta belgi bor, {left} tasi qoldi. Matnni qisqartiring yoki obuna rasmiylashtiring.',

    fileNote: 'Matnli fayl · to‘liq ovozlashtiriladi',
    fileRemove: 'Faylni olib tashlash',
    filePick: 'Matnli fayl tanlash',
    textPlaceholder: 'Ovozlashtirish uchun matnni joylashtiring…',

    errFileTooBig: 'Fayl 40 MB dan katta. Uni bo‘laklarga ajrating.',
    errFilePath: 'Fayl manzilini o‘qib bo‘lmadi. Uni yana bir marta tanlab ko‘ring.',

    okArchive: 'Arxiv qabul qilindi. {n} ta vazifa yaratildi, har biri tarixda ko‘rinadi.',
    okStarted: 'Ovozlashtirish boshlandi.',

    costUnlimited: 'Cheksiz: belgilar yechilmaydi',
    costFile: 'Fayl hajmini xizmat yuklash paytida hisoblaydi · {left} qoldi',
    costText: 'Taxminan {cost} belgi yechiladi · {left} qoldi',

    running: 'Ishga tushiryapmiz…',
    run: 'Ovozlashtirish',

    formats: 'Formatlar: TXT, MD, SRT, DOCX, ZIP - arxivdan bir nechta vazifa chiqadi'
  }
};
