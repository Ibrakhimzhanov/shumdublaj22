/* Строки экрана «Библиотека голосов»: русский и узбекский.
   Пол, возраст и языки голоса подписываются через src/lib/format.js,
   поэтому здесь их переводов нет. */

export default {
  ru: {
    moreLoading: 'Загружаем ещё…',
    listEnd: 'Это все голоса по заданному отбору',
    cardHint: 'Нажмите на карточку, чтобы выбрать голос. Двойное нажатие вернёт к озвучке.',
    cardTitle: 'Выбрать голос, двойное нажатие вернёт к озвучке',
    /* вкладки и сортировка */
    tabPublic: 'Публичные голоса',
    tabFav: 'Избранные',
    tabClones: 'Клонированные мной',
    tabDescribed: 'Созданные по описанию',
    sortPopular: 'Популярные',
    sortMostUsed: 'Часто используемые',
    sortTrending: 'В тренде',
    sortNew: 'Новые',

    /* подписи карточки */
    noName: 'Без названия',
    ownVoice: 'Свой голос',
    noTraits: 'Характеристики не указаны',
    badgeSelected: 'Выбран',
    select: 'Выбрать',
    favOn: 'В избранное',
    favOff: 'Убрать из избранного',
    playSample: 'Прослушать образец',
    noSampleTitle: 'У этого голоса нет образца',
    noSampleBtn: 'Без образца',
    noSampleHint: 'У этого голоса нет образца - прослушивание недоступно',
    pause: 'Пауза',
    sample: 'Образец',
    copyId: 'Скопировать идентификатор',
    rename: 'Переименовать',
    deleteBtn: 'Удалить',

    /* действия и уведомления */
    selected: 'Голос «{name}» выбран для озвучки',
    renamePrompt: 'Новое название голоса',
    renamed: 'Голос переименован',
    deleteTitle: 'Удалить голос?',
    deleteSub: '«{name}» будет удалён безвозвратно. Отменить это действие нельзя.',
    deleted: 'Голос удалён',
    noId: 'У этого голоса нет идентификатора',
    idCopied: 'Идентификатор голоса скопирован',

    /* пустые экраны */
    emptyFoundTitle: 'Ничего не найдено',
    emptyFoundSub: 'По заданному отбору голосов нет. Измените запрос или сбросьте фильтры.',
    emptyFoundAct: 'Сбросить отбор',
    emptyFavTitle: 'В избранном пока пусто',
    emptyFavSub: 'Отмечайте голоса звёздочкой - они соберутся здесь, чтобы не искать заново.',
    emptyClonesTitle: 'Своих клонов пока нет',
    emptyClonesSub: 'Запишите чистый образец 30-60 секунд и создайте первый клонированный голос.',
    emptyClonesAct: 'Клонировать голос',
    emptyDescribedTitle: 'Голосов по описанию пока нет',
    emptyDescribedSub: 'Опишите характер голоса словами - получите три варианта на выбор.',
    emptyDescribedAct: 'Создать по описанию',
    emptyAllTitle: 'Голосов пока нет',
    emptyAllSub: 'Каталог вернулся пустым. Попробуйте обновить список чуть позже.',
    emptyAllAct: 'Обновить',

    /* боковая колонка, загрузка, страницы */
    sideTitle: 'Библиотека',
    searchPh: 'Поиск…',
    filters: 'Фильтры',
    sortCap: 'Сортировка',
    loading: 'Загружаем голоса…',
    loadErr: 'Не удалось загрузить голоса',
    retry: 'Повторить',
    prev: '← Назад',
    next: 'Вперёд →',
    pageOf: 'Стр. {page} из {pages}',

    /* окно фильтров */
    anyOpt: 'Любой',
    close: 'Закрыть',
    capGender: 'Пол',
    capAge: 'Возраст',
    capLang: 'Язык',
    reset: 'Сбросить',
    apply: 'Применить'
  },

  uz: {
    moreLoading: 'Yana yuklanmoqda…',
    listEnd: 'Tanlangan saralash bo‘yicha ovozlar shu bilan tugadi',
    cardHint: 'Ovozni tanlash uchun kartani bosing. Ikki marta bosish ovozlashtirishga qaytaradi.',
    cardTitle: 'Ovozni tanlash, ikki marta bosish ovozlashtirishga qaytaradi',
    /* вкладки и сортировка */
    tabPublic: 'Ommaviy ovozlar',
    tabFav: 'Sevimlilar',
    tabClones: 'Men klonlaganlarim',
    tabDescribed: 'Tavsif bo‘yicha yaratilganlar',
    sortPopular: 'Ommabop',
    sortMostUsed: 'Tez-tez ishlatiladigan',
    sortTrending: 'Trendda',
    sortNew: 'Yangi',

    /* подписи карточки */
    noName: 'Nomsiz',
    ownVoice: 'O‘z ovozingiz',
    noTraits: 'Xususiyatlari ko‘rsatilmagan',
    badgeSelected: 'Tanlangan',
    select: 'Tanlash',
    favOn: 'Sevimlilarga qo‘shish',
    favOff: 'Sevimlilardan olib tashlash',
    playSample: 'Namunani tinglash',
    noSampleTitle: 'Bu ovozning namunasi yo‘q',
    noSampleBtn: 'Namuna yo‘q',
    noSampleHint: 'Bu ovozning namunasi yo‘q, tinglab bo‘lmaydi',
    pause: 'Pauza',
    sample: 'Namuna',
    copyId: 'Identifikatorni nusxalash',
    rename: 'Nomini o‘zgartirish',
    deleteBtn: 'O‘chirish',

    /* действия и уведомления */
    selected: '«{name}» ovozi tanlandi',
    renamePrompt: 'Ovozning yangi nomi',
    renamed: 'Ovoz nomi o‘zgartirildi',
    deleteTitle: 'Ovoz o‘chirilsinmi?',
    deleteSub: '«{name}» butunlay o‘chiriladi. Bu amalni bekor qilib bo‘lmaydi.',
    deleted: 'Ovoz o‘chirildi',
    noId: 'Bu ovozning identifikatori yo‘q',
    idCopied: 'Ovoz identifikatori nusxalandi',

    /* пустые экраны */
    emptyFoundTitle: 'Hech narsa topilmadi',
    emptyFoundSub: 'Tanlangan shartlarga mos ovoz yo‘q. So‘rovni o‘zgartiring yoki filtrlarni tozalang.',
    emptyFoundAct: 'Tanlovni tozalash',
    emptyFavTitle: 'Sevimlilar hozircha bo‘sh',
    emptyFavSub: 'Ovozlarni yulduzcha bilan belgilang, ular shu yerga to‘planadi va qayta qidirishga hojat qolmaydi.',
    emptyClonesTitle: 'Hozircha klonlangan ovozlaringiz yo‘q',
    emptyClonesSub: '30-60 soniyalik toza namuna yozing va birinchi klon ovozingizni yarating.',
    emptyClonesAct: 'Ovozni klonlash',
    emptyDescribedTitle: 'Tavsif bo‘yicha yaratilgan ovozlar hozircha yo‘q',
    emptyDescribedSub: 'Ovoz qanday bo‘lishini so‘z bilan tasvirlang, tanlash uchun uchta variant olasiz.',
    emptyDescribedAct: 'Tavsif bo‘yicha yaratish',
    emptyAllTitle: 'Hozircha ovozlar yo‘q',
    emptyAllSub: 'Katalog bo‘sh qaytdi. Ro‘yxatni birozdan keyin yangilab ko‘ring.',
    emptyAllAct: 'Yangilash',

    /* боковая колонка, загрузка, страницы */
    sideTitle: 'Kutubxona',
    searchPh: 'Qidiruv…',
    filters: 'Filtrlar',
    sortCap: 'Saralash',
    loading: 'Ovozlar yuklanmoqda…',
    loadErr: 'Ovozlarni yuklab bo‘lmadi',
    retry: 'Qayta urinish',
    prev: '← Orqaga',
    next: 'Oldinga →',
    pageOf: '{page}-sahifa, jami {pages}',

    /* окно фильтров */
    anyOpt: 'Har qanday',
    close: 'Yopish',
    capGender: 'Jinsi',
    capAge: 'Yoshi',
    capLang: 'Tili',
    reset: 'Tozalash',
    apply: 'Qo‘llash'
  }
};
