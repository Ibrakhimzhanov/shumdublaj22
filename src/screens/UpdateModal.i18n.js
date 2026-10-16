/* Строки окна обновления приложения.
   Текст ошибки от сервиса обновлений (поле error) и changelog релиза
   показываем как есть, поэтому их здесь нет. */

export default {
  ru: {
    availTitle: 'Доступно обновление {v}',
    size: 'Размер: {size}',
    later: 'Позже',
    update: 'Обновить',

    dlTitle: 'Скачиваем обновление…',
    dlProgress: '{got} из {total}',

    readyTitle: 'Обновление готово',
    readySub: 'Перезапустите приложение, чтобы установить версию {v}. Текущие задачи продолжат выполняться на сервере.',
    restart: 'Перезапустить',

    errTitle: 'Не удалось скачать обновление',
    continueWork: 'Продолжить работу',

    laterToast: 'Версия {v} отложена - больше не напомним о ней',
    noFile: 'Сервис обновлений не вернул файл',
    installFailed: 'Не удалось запустить установщик'
  },

  uz: {
    availTitle: 'Yangilanish mavjud: {v}',
    size: 'Hajmi: {size}',
    later: 'Keyinroq',
    update: 'Yangilash',

    dlTitle: 'Yangilanish yuklab olinmoqda…',
    dlProgress: '{got} / {total}',

    readyTitle: 'Yangilanish tayyor',
    readySub: '{v} versiyasini o‘rnatish uchun dasturni qayta ishga tushiring. Joriy vazifalar serverda davom etaveradi.',
    restart: 'Qayta ishga tushirish',

    errTitle: 'Yangilanishni yuklab bo‘lmadi',
    continueWork: 'Ishni davom ettirish',

    laterToast: '{v} versiyasi keyinga qoldirildi, bu haqda boshqa eslatmaymiz',
    noFile: 'Yangilanish xizmati faylni qaytarmadi',
    installFailed: 'O‘rnatuvchini ishga tushirib bo‘lmadi'
  }
};
