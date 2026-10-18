# Установка

deffector состоит из двух половин: **агента** — пакета, который импортирует приложение, и **панели** —
расширения браузера или отдельного приложения.

## Требования

| Что                   | Минимум                                                                                                                                     | Проверено на                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| effector              | 22.6                                                                                                                                        | 23.4.4, 22.8.6                                              |
| React                 | React 16.8 и effector-react 22                                                                                                              | React 16.8, 16.14, 17.0, 19.3; effector-react 22.5, 23.3    |
| Vue                   | Vue 3.0 и effector-vue 22                                                                                                                   | Vue 3.0, 3.2, 3.3, 3.5; effector-vue 22.2, 23.0, 23.2       |
| Solid                 | solid-js 1.3 и effector-solid 0.22                                                                                                          | solid-js 1.3, 1.4, 1.5, 1.6, 1.9; effector-solid 0.22, 0.23 |
| Next.js               | 13.4 (App Router, `@effector/next`)                                                                                                         | 15.5                                                        |
| Браузер с расширением | Chrome или Edge 116, Firefox 140 (Firefox для Android 142)                                                                                  | свежий Chrome                                               |
| Отдельное приложение  | Node 18                                                                                                                                     | Node 22                                                     |
| Агент в Node-процессе | Node 22 (глобальный `WebSocket`); на старых — передайте `WebSocket` из `ws`                                                                 | Node 22                                                     |
| React Native          | любая версия (в нём есть глобальный `WebSocket`)                                                                                            | —                                                           |
| TypeScript            | 5.0 с `moduleResolution` `"bundler"`, `"node16"` или `"nodenext"`                                                                           | 5.9                                                         |
| Сборщик               | читающий поле `exports`: Vite, webpack 5, Next.js, esbuild, Rollup; Parcel 2 с `packageExports` (см. [Parcel](/ru/guide/frameworks#parcel)) | Vite 7, Next.js 15, Parcel 2.9                              |
| Сборка из исходников  | Node 22                                                                                                                                     | Node 22                                                     |

Адаптеры для фреймворков необязательны: чистому effector нужен только `effector`. Для Vue 2 адаптера
нет (effector-vue поддерживает scope только во Vue 3), но такие приложения работают в
[глобальном режиме](/ru/guide/frameworks#глобальныи-режим-без-fork). Babel/swc-плагин тоже
необязателен; без него панель показывает меньше — см.
[Без babel/swc-плагина](/ru/guide/frameworks#без-babel-swc-плагина).

## Агент

```sh
npm install @deffector/agent
```

Ставьте его обычной зависимостью: его импортирует код приложения, а в продакшен-сборке он превращается в
пустышку (см. [Продакшен-сборка](#продакшен-сборка)). Адаптеры для фреймворков — необязательные
peer-зависимости: ставьте только те, что используете (`effector-react`, `effector-vue`,
`effector-solid`).

Дальше — [Быстрый старт](/ru/guide/quick-start).

## Расширение браузера

**Chrome и Edge:** установите deffector из
[Chrome Web Store](https://chromewebstore.google.com/detail/cnnimkkficcbbkaohlafpnbgpkhpkfjn). Edge ставит его оттуда же
(разрешите расширения из других магазинов, когда Edge спросит).

**Firefox** или самый свежий код из репозитория: соберите расширение из исходников и загрузите как
распакованное.

```sh
git clone https://github.com/mxmvshnvsk/deffector.git
cd deffector
npm install
npm run build   # агент, демо-модель, расширение (Chrome + Firefox), standalone
```

Сборка создаёт две папки:

- `packages/extension/dist` — Chrome и Edge (Manifest V3, Chrome 116+);
- `packages/extension/dist-firefox` — Firefox (Manifest V3 с фоновыми скриптами, Firefox 140+).

### Chrome

1. Откройте `chrome://extensions`.
2. Включите **Режим разработчика** (справа вверху).
3. Нажмите **Загрузить распакованное** и выберите `packages/extension/dist`.

### Edge

1. Откройте `edge://extensions`.
2. Включите **Режим разработчика**.
3. Нажмите **Загрузить распакованное** и выберите `packages/extension/dist`.

### Firefox

1. Откройте `about:debugging`.
2. Выберите **Этот Firefox**.
3. Нажмите **Загрузить временное дополнение** и выберите
   `packages/extension/dist-firefox/manifest.json`.

Firefox удаляет временные дополнения при перезапуске — после перезапуска загрузите его снова.

### Проверка

Откройте страницу приложения, которая импортирует агента. Иконка расширения на панели браузера
станет из серой цветной, а её всплывающее окно напишет «effector _версия_ найден» и сколько сторов
имеют `sid`. Откройте DevTools: вкладка **deffector** появится рядом с Elements, Console и остальными.
Панель следует теме DevTools (тёмной или светлой) и языку браузера (русский или английский; кнопка
**EN** / **RU** в панели инструментов переключает его).

На странице без агента всплывающее окно пишет «Агент deffector не найден» и показывает, какой импорт
добавить.

### Сайты кроме localhost

На `localhost` и `127.0.0.1` (любой порт) расширение работает сразу после установки. На любом другом
адресе — стенде, превью, локальном домене — Chrome пускает его только после того, как вы один раз
разрешите этот сайт: панель покажет «У deffector нет доступа к _хосту_» и кнопку **Разрешить на этом
сайте** (то же предлагает всплывающее окно на панели браузера). После этого расширение подключится к
открытой странице и ко всем страницам этого сайта. Разрешённые сайты видны в `chrome://extensions` →
deffector → **Подробнее** → **Доступ к сайтам**, там же их можно убрать.

### Пересборка

После `npm run build` нажмите ↻ на карточке расширения в `chrome://extensions` и откройте DevTools
заново. Если вы работаете над самим расширением, пересобирайте его при изменениях:

```sh
npm run watch -w @deffector/extension
```

## Отдельное приложение

Для SSR-серверов, скриптов Node, тестов и React Native:

```sh
npx @deffector/standalone              # панель на http://localhost:8686
```

Из клона репозитория: `npm run standalone`. Подробнее — в разделе
[Node, SSR, React Native](/ru/guide/node-ssr).

## Продакшен-сборка

У каждой точки входа `@deffector/agent` есть условие экспорта `production`, которое указывает на
пустышку с тем же API: `import '@deffector/agent'` ничего не делает, `DeffectorProvider` — обычный
`Provider` из effector, `attachDeffector` и `registerScope` возвращают пустые объекты. Сборщики выбирают
это условие в продакшен-режиме (Vite и webpack — да), так что импорт можно оставить в коде.

Точка входа для Node (`@deffector/agent/node`) вдобавок ничего не делает при `NODE_ENV=production`,
если не передать `skipInProduction: false`.
