# Настройки

Агент создаётся при импорте `@deffector/agent` с настройками по умолчанию, которые подходят
большинству приложений. Изменить их можно через `attachDeffector` сразу после импорта.

```ts
import '@deffector/agent';
import { attachDeffector } from '@deffector/agent';

attachDeffector({
  name: 'shop',
  build: import.meta.env.VITE_GIT_SHA,
  whileClosed: 'record',
});
```

`attachDeffector` можно вызывать несколько раз: каждый вызов меняет только переданные опции. Функция
возвращает `{ agent, detach }`; `detach()` отключает `transport`, переданный в том же вызове.

## Опции агента

| Опция             | По умолчанию                    | Значение                                                                                                                                                                                               |
| ----------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`            | `document.title`, иначе `'app'` | имя приложения в панели и в трейсах; пресеты и сохранённые фильтры хранятся отдельно для каждого имени                                                                                                 |
| `build`           | —                               | идентификатор сборки (git sha), записывается в трейсы; при импорте трейса с другой сборки проверка предупредит, что sid могли сдвинуться                                                               |
| `whileClosed`     | `'pause'`                       | `'pause'`: перестать писать через `graceMs` после загрузки, если панель не подключена, и продолжить, когда подключится. `'record'`: писать всегда. См. [Производительность](/ru/reference/performance) |
| `graceMs`         | `10000`                         | сколько агент пишет после загрузки, прежде чем встать на паузу без панели, мс                                                                                                                          |
| `hardStop`        | `100000`                        | число шагов за один синхронный проход ядра, после которого deffector обрывает распространение (иначе бесконечный цикл повесит вкладку); `false` отключает аварийную остановку                          |
| `lockPast`        | `true`                          | накрывать страницу, пока она показывает прошлое, чтобы клик его не изменил                                                                                                                             |
| `maxTransactions` | `1000`                          | сколько транзакций хранится в истории; более старые удаляются                                                                                                                                          |
| `maxSteps`        | `5000`                          | сколько шагов записывается на транзакцию; остальное дерево шагов обрезается, а Health сообщает о возможном бесконечном цикле                                                                           |
| `scope`           | —                               | scope для регистрации (без адаптера его нельзя переключать, см. ниже)                                                                                                                                  |
| `scopeName`       | —                               | имя этого scope                                                                                                                                                                                        |
| `transport`       | —                               | дополнительный транспорт, например `createWebSocketTransport()` к отдельному приложению                                                                                                                |

[`attachDeffectorNode`](/ru/guide/node-ssr#подключение-процесса-node) принимает те же опции и вдобавок
`url`, `WebSocket`, `retry`, `onStatus` и `skipInProduction`.

## Точки входа

| Импорт                   | Экспорты                                                                                        | В продакшене                   |
| ------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------ |
| `@deffector/agent`       | сам агент (побочный эффект), `attachDeffector`, `registerScope`, `registerModel`, `getAgent`    | пустышка с тем же API          |
| `@deffector/agent/react` | `DeffectorProvider` (`value`, `name`, `children`)                                               | `Provider` из effector-react   |
| `@deffector/agent/vue`   | `withDeffector(App, { scope, name })`, `DeffectorScope` (`scope`, `name`)                       | передаёт scope тем же способом |
| `@deffector/agent/solid` | `DeffectorProvider` (`value`, `name`, `children`)                                               | `Provider` из effector-solid   |
| `@deffector/agent/node`  | `attachDeffectorNode`, `registerScope`, `registerModel`, `getAgent`, `createWebSocketTransport` | пустышка с тем же API          |

«В продакшене» — это условие экспорта `production`, которое Vite и webpack применяют в продакшен-сборке.
`@deffector/agent/node` вдобавок ничего не делает при `NODE_ENV=production`.

## registerScope

```ts
import { registerScope } from '@deffector/agent';

registerScope(scope, { name: 'client' });
```

Даёт scope понятное имя в списке scope. deffector и так замечает каждый scope через ядро; имена
помогают, когда их несколько (scope на запрос на сервере, scope на виджет).

Второе поле, `switcher`, передают адаптеры фреймворков: это функция, которая отрисовывает приложение с
другим scope. С ней deffector может показать форк прошлого и воспроизвести трейс в свежем scope, не
трогая настоящее. Если для вашего UI-слоя адаптера нет, его можно написать:

```ts
let current = scope;

registerScope(scope, {
  name: 'client',
  switcher: (next) => {
    current = next; // с этого момента отрисовывать этот scope
    rerender(); // перерисовать UI с `current`
  },
});
```

После переключения UI должен читать юниты через новый scope; поэтому адаптеры Vue и Solid пересоздают
своё поддерево.

## registerModel

```ts
import { registerModel } from '@deffector/agent';

const signupForm = createSignupForm();
registerModel(signupForm, 'signupForm');
```

Собирает юниты экземпляра модели под одним именем: **Stores → Модель** и **Graph → Группы: модель**
показывают их вместе. Передайте то, что вернула фабрика; deffector обойдёт объект (включая вложенные,
до четырёх уровней) и соберёт найденные юниты.

Объекты с методом `@@debug` из предложения
[patronum#297](https://github.com/effector/patronum/issues/297) работают как есть —
`registerModel(instance)` вызывает его и берёт `name` и `units`:

```ts
function createCounter(name: string) {
  const inc = createEvent();
  const $count = createStore(0).on(inc, (n) => n + 1);
  return {
    inc,
    $count,
    '@@debug': () => ({ name, units: { inc, $count } }),
  };
}

registerModel(createCounter('likes'));
```

Без `registerModel` группировка по модели использует имя фабрики, которое записывает babel/swc-плагин.

## getAgent

`getAgent()` возвращает экземпляр агента. Это для инструментов и тестов; его API внутренний и может
меняться.
