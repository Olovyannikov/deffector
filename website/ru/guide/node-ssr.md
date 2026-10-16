# Node, SSR, React Native

У кода, который выполняется не во вкладке браузера, нет DevTools, к которым можно подключиться. Для
него у deffector есть **отдельное приложение**: небольшой сервер, который отдаёт ту же панель в обычной
вкладке браузера и пересылает сообщения между вашим процессом и этой вкладкой по WebSocket.

<Architecture />

## Запуск отдельного приложения

```sh
npx @deffector/standalone            # панель на http://localhost:8686
```

Из клона репозитория: `npm run standalone`.

| Флаг / переменная                 | По умолчанию | Значение                                                                        |
| --------------------------------- | ------------ | ------------------------------------------------------------------------------- |
| `--port <n>` или `DEFFECTOR_PORT` | `8686`       | порт HTTP и WebSocket                                                           |
| `--host <адрес>`                  | `127.0.0.1`  | интерфейс для прослушивания; `0.0.0.0` — принимать устройства из локальной сети |
| `--help`                          |              | краткая справка                                                                 |

Сервер отвечает по таким адресам:

- `http://localhost:8686/` — панель;
- `ws://localhost:8686/agent` — сюда подключаются агенты;
- `ws://localhost:8686/panel` — сюда подключаются панели (страница на `/` делает это сама);
- `http://localhost:8686/targets.json` — список подключённых агентов.

При подключении и отключении агента сервер пишет строку в консоль. Агентов может быть несколько
(dev-сервер, скрипт, телефон): нужный выбирается в списке **Агент** над панелью. Значение по умолчанию,
«авто: последний подключившийся», следует за самым свежим агентом, поэтому перезапущенный dev-сервер
подхватывается сам.

Страница панели понимает параметры URL: `?agent=<id>` (id из `targets.json`), `?lang=ru` или
`?lang=en`, `?theme=light` или `?theme=dark` (по умолчанию — как в системе).

## Подключение процесса Node

```ts
// до модулей, которые создают юниты
import { attachDeffectorNode, registerScope } from '@deffector/agent/node';

attachDeffectorNode({ name: 'my-server' });
```

`attachDeffectorNode` создаёт WebSocket-транспорт к отдельному приложению и настраивает агента. Функция
принимает все [опции агента](/ru/reference/configuration#опции-агента) и вдобавок:

| Опция              | По умолчанию                                                  | Значение                                                                |
| ------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `url`              | переменная `DEFFECTOR_URL`, иначе `ws://localhost:8686/agent` | адрес отдельного приложения                                             |
| `WebSocket`        | глобальный `WebSocket`                                        | реализация для сред, где его нет (например, `WebSocket` из пакета `ws`) |
| `retry`            | `1500`                                                        | задержка переподключения, мс; транспорт переподключается бесконечно     |
| `onStatus`         | —                                                             | `(status: 'open' \| 'closed') => void`, для логов                       |
| `skipInProduction` | `true`                                                        | ничего не делать при `NODE_ENV=production`                              |

Возвращает `{ detach() }`, который закрывает сокет. Таймеры транспорта вызывают `unref`, поэтому он
никогда не держит процесс живым. Пока сокет недоступен, сообщения отбрасываются; когда панель
возвращается, она заново запрашивает всё.

В Node 22 есть глобальный `WebSocket`. В более старых версиях передайте свой:

```ts
import WebSocket from 'ws';

attachDeffectorNode({ name: 'my-server', WebSocket });
```

### Scope на каждый запрос

На сервере каждый запрос обычно создаёт свой scope. Зарегистрируйте его, чтобы видеть понятное имя в
списке scope:

```ts
import { createServer } from 'node:http';
import { allSettled, fork, serialize } from 'effector';

let n = 0;

createServer(async (req, res) => {
  const scope = fork();
  registerScope(scope, { name: `request #${++n} ${req.url}` });
  await allSettled(pageStarted, { scope, params: req.url });
  res.end(render(serialize(scope)));
});
```

Каждый запрос тогда виден как отдельный scope; список **scope** в панели инструментов фильтрует лог по
одному из них. На нагруженном сервере держите `maxTransactions` умеренным (демо используют `2000`):
история хранится в памяти.

::: tip Перемещение во времени на сервере
На сервере переход записывает значения в scope запроса на месте: нет UI, который мог бы отрисовать
форк. Просмотр, правки, подмена эффектов и экспорт трейсов работают как обычно.
:::

## Сервер Next.js

В `instrumentation.ts`, только для рантайма Node.js:

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { attachDeffectorNode } = await import('@deffector/agent/node');
    attachDeffectorNode({ name: 'next (server)', maxTransactions: 2000 });
  }
}
```

Браузерная часть, как обычно, идёт в расширение — см.
[Next.js App Router](/ru/guide/frameworks#next-js-app-router).

## React Native

Устройство или эмулятор подключаются к отдельному приложению на вашем компьютере, поэтому приложение
должно слушать сеть, а агент — использовать адрес компьютера:

```sh
npx @deffector/standalone --host 0.0.0.0
```

```ts
// index.js — до модулей, которые создают юниты
import { attachDeffectorNode } from '@deffector/agent/node';

attachDeffectorNode({ name: 'app', url: 'ws://192.168.1.10:8686/agent' });
```

В React Native есть глобальный `WebSocket`, больше ничего не нужно. В релизных сборках
`attachDeffectorNode` ничего не делает (`NODE_ENV=production`). Сам модуль при этом всё равно
импортируется; если ваш сборщик не применяет условие экспорта `production`, а в релизе не должно быть
кода агента вообще, загружайте его под `__DEV__`:

```ts
if (__DEV__) {
  require('@deffector/agent/node').attachDeffectorNode({
    name: 'app',
    url: 'ws://192.168.1.10:8686/agent',
  });
}
```

Рендерите приложение через `DeffectorProvider` из `@deffector/agent/react`, как в вебе, чтобы
перемещение во времени и воспроизведение могли подменять scope.

## Скрипты и тесты

Тот же вызов работает в любом скрипте Node, в том числе в тестах: запустите отдельное приложение,
вызовите `attachDeffectorNode()` в setup-файле и смотрите транзакции теста в панели. Помните про
`skipInProduction`: если тест-раннер выставляет `NODE_ENV=production`, передайте
`skipInProduction: false`.

## Попробовать

```sh
npm run standalone            # терминал 1: панель на http://localhost:8686
npm run dev:node-ssr          # терминал 2: сервер на http://localhost:5176
```

Откройте http://localhost:5176 несколько раз (попробуйте `/?email=taken@example.com`) и посмотрите на
scope в http://localhost:8686. См. [Демо](/ru/reference/demos).
