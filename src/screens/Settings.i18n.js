/* Строки шторки настроек озвучки.

   Подписи моделей и параметров лежат здесь, а не в lib/models.js: сам каталог
   моделей остаётся без языка, а перевод подбираем по идентификаторам.
     модель      -> model_<m.id>_name / model_<m.id>_desc / model_<m.id>_noParams
     параметр    -> param_<p.key>
     именованный -> named_<key> и named_<key>_<value>
     переключат. -> toggle_<key> */

export default {
  ru: {
    title: 'Настройки озвучки',
    close: 'Закрыть',

    sectionText: 'Обработка текста',
    voiceCaption: 'Голос озвучки',
    voiceNotSelected: 'Не выбран',
    changeVoice: 'Сменить',

    splitLabel: 'Разбиение текста',
    splitBySize: 'По размеру части',
    splitByPara: 'По абзацам',
    partSize: 'Размер части, симв.',
    pause: 'Пауза между частями, с',
    threads: 'Параллельные потоки',
    threadsHint: 'Максимум {n} на вашем тарифе',

    modelUnsupported: 'Выбранный голос не поддерживает эту модель',
    voiceModelWarn: 'Голос «{voice}» не поддерживает модель «{model}». Выберите другую модель или другой голос.',
    modelParams: 'Параметры модели · {model}',

    toggleOn: 'Включён',
    toggleOff: 'Выключен',

    cancel: 'Отмена',
    save: 'Сохранить',
    saving: 'Сохраняем…',
    savedToast: 'Настройки озвучки сохранены',

    model_shum_name: 'Shum V3',
    model_shum_desc: 'Флагман: живые интонации',
    model_aria_name: 'Aria Pro',
    model_aria_desc: 'Тонкая настройка тембра',
    model_turbo_name: 'Turbo',
    model_turbo_desc: 'Быстро и экономно',
    model_lite_name: 'Lite',
    model_lite_desc: 'Черновая озвучка, без настроек',
    model_lite_noParams: 'У модели Lite нет настраиваемых параметров - она всегда работает с базовыми настройками. Выберите другую модель, если нужна тонкая настройка.',

    param_speed: 'Скорость',
    param_stability: 'Стабильность',
    param_similarity: 'Похожесть',
    param_style: 'Выразительность',

    named_stability: 'Характер речи',
    named_stability_100: 'Спокойный',
    named_stability_50: 'Нейтральный',
    named_stability_0: 'Выразительный',

    toggle_use_speaker_boost: 'Усилитель чёткости'
  },

  uz: {
    title: 'Ovoz sozlamalari',
    close: 'Yopish',

    sectionText: 'Matnni qayta ishlash',
    voiceCaption: 'Tanlangan ovoz',
    voiceNotSelected: 'Tanlanmagan',
    changeVoice: 'O‘zgartirish',

    splitLabel: 'Matnni bo‘lish',
    splitBySize: 'Bo‘lak hajmi bo‘yicha',
    splitByPara: 'Xatboshilar bo‘yicha',
    partSize: 'Bo‘lak hajmi, belgi',
    pause: 'Bo‘laklar orasidagi pauza, s',
    threads: 'Parallel oqimlar',
    threadsHint: 'Tarifingizda ko‘pi bilan {n} ta',

    modelUnsupported: 'Tanlangan ovoz bu modelni qo‘llab-quvvatlamaydi',
    voiceModelWarn: '«{voice}» ovozi «{model}» modelini qo‘llab-quvvatlamaydi. Boshqa model yoki boshqa ovoz tanlang.',
    modelParams: 'Model sozlamalari · {model}',

    toggleOn: 'Yoqilgan',
    toggleOff: 'O‘chirilgan',

    cancel: 'Bekor qilish',
    save: 'Saqlash',
    saving: 'Saqlanmoqda…',
    savedToast: 'Ovoz sozlamalari saqlandi',

    model_shum_name: 'Shum V3',
    model_shum_desc: 'Flagman: jonli ohanglar',
    model_aria_name: 'Aria Pro',
    model_aria_desc: 'Tembrni nozik sozlash',
    model_turbo_name: 'Turbo',
    model_turbo_desc: 'Tez va tejamli',
    model_lite_name: 'Lite',
    model_lite_desc: 'Qoralama ovoz, sozlamasiz',
    model_lite_noParams: 'Lite modelida sozlanadigan parametrlar yo‘q, u doim asosiy sozlamalar bilan ishlaydi. Nozik sozlash kerak bo‘lsa, boshqa modelni tanlang.',

    param_speed: 'Tezlik',
    param_stability: 'Barqarorlik',
    param_similarity: 'O‘xshashlik',
    param_style: 'Ifodalilik',

    named_stability: 'Nutq xarakteri',
    named_stability_100: 'Xotirjam',
    named_stability_50: 'Neytral',
    named_stability_0: 'Ifodali',

    toggle_use_speaker_boost: 'Aniqlik kuchaytirgichi'
  }
};
