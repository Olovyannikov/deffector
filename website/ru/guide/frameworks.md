# Фреймворки

Агент не зависит от фреймворка: в любой конфигурации первым идёт `import '@deffector/agent'`.
Отличается **адаптер**, который передаёт scope в UI. Адаптеры — прямая замена провайдеров effector:
они регистрируют scope под понятным именем и позволяют deffector отрисовать приложение с другим scope
для перемещения во времени и воспроизведения.

| Конфигурация                    | Адаптер                                                      | Перемещение во времени         |
| ------------------------------- | ------------------------------------------------------------ | ------------------------------ |
| React + `fork()`                | `DeffectorProvider` из `@deffector/agent/react`              | форк, настоящее не трогается   |
| Vue + `fork()`                  | `withDeffector` / `DeffectorScope` из `@deffector/agent/vue` | форк, настоящее не трогается   |
| Solid + `fork()`                | `DeffectorProvider` из `@deffector/agent/solid`              | форк, настоящее не трогается   |
| Next.js App Router              | `DeffectorProvider` в клиентской обёртке                     | форк, настоящее не трогается   |
| `fork()` без адаптера           | —                                                            | значения записываются на месте |
| Глобальный режим (без `fork()`) | —                                                            | значения записываются на месте |

::: tip Одна копия effector
Агент подключается к тому экземпляру effector, который импортирует сам. Если в сборку попали две копии
(слинкованный пакет, монорепозиторий), deffector увидит только одну. В Vite их можно объединить:
`resolve: { dedupe: ['effector', 'effector-react'] }`.
:::

::: tip Parcel
Parcel 2 по умолчанию не читает поле `exports` у пакетов, поэтому `@deffector/agent/node` и адаптеры
не находятся. Включите его в `package.json`:
`"@parcel/resolver-default": { "packageExports": true }`. После этого `parcel build` берёт
пустышку агента для продакшена, так что для отладки запускайте dev-сервер (`parcel src/index.html`).
:::

## React

```tsx
import '@deffector/agent';
import { createRoot } from 'react-dom/client';
import { fork } from 'effector';
import { DeffectorProvider } from '@deffector/agent/react';
import { App } from './App';

const scope = fork();

createRoot(document.getElementById('root')!).render(
  <DeffectorProvider value={scope} name="client">
    <App />
  </DeffectorProvider>,
);
```

`DeffectorProvider` принимает тот же `value`, что и `Provider` из effector-react, плюс необязательный
`name`. Внутри компоненты, как обычно, используют `useUnit`. Работает React 16.8 и новее; на React 16 и
17 рендерите через `ReactDOM.render`, как и раньше.

Если компоненты берут хуки из `effector-react/scope` (так часто пишут на effector-react 22), импортируйте
провайдер из `@deffector/agent/react-scope`: у этой точки входа свой контекст, и провайдер из
`effector-react` оставил бы хуки без scope.

```tsx
import { useStore } from 'effector-react/scope';
import { DeffectorProvider } from '@deffector/agent/react-scope';
```

## Vue

```ts
import '@deffector/agent';
import { createApp } from 'vue';
import { fork } from 'effector';
import { withDeffector } from '@deffector/agent/vue';
import App from './App.vue';

const scope = fork();

// передаёт scope в effector-vue (как EffectorScopePlugin)
// и позволяет deffector подменять его для перемещения во времени и воспроизведения
createApp(withDeffector(App, { scope, name: 'client' })).mount('#app');
```

Можно и компонентом:

```vue
<DeffectorScope :scope="scope" name="client"><App /></DeffectorScope>
```

Композиции effector-vue читают scope один раз, в `setup`, поэтому при подмене scope (переход,
воспроизведение) поддерево внутри `DeffectorScope` монтируется заново. Локальное состояние компонентов
в нём сбрасывается.

`withDeffector` заменяет `EffectorScopePlugin` (effector-vue 23) и `VueSSRPlugin` (effector-vue 22): он
передаёт scope тем же способом, поэтому его видят `useUnit`, `useStore` и `useEvent` обеих версий.
Работает Vue 3.0 и новее. Во Vue 2 effector-vue не поддерживает scope — такие приложения запускайте в
[глобальном режиме](#глобальныи-режим-без-fork).

## Solid

```tsx
import '@deffector/agent';
import { render } from 'solid-js/web';
import { fork } from 'effector';
import { DeffectorProvider } from '@deffector/agent/solid';
import { App } from './App';

const scope = fork();

render(
  () => (
    <DeffectorProvider value={scope} name="client">
      <App />
    </DeffectorProvider>
  ),
  document.getElementById('root')!,
);
```

Как и во Vue, примитивы effector-solid читают scope при создании компонента, поэтому при подмене scope
поддерево создаётся заново. Работает solid-js 1.3 и новее.

Если компоненты берут `useUnit` из `effector-solid/scope`, импортируйте провайдер из
`@deffector/agent/solid-scope`: у этой точки входа свой контекст.

## Next.js App Router

С [`@effector/next`](https://github.com/effector/next) клиент держит один scope и передаёт его через
`Provider` из effector-react. deffector нужны две небольшие вещи.

**Клиент:** импортируйте агента в `instrumentation-client.ts` — Next.js выполняет его в браузере до кода
приложения:

```ts
// instrumentation-client.ts
import '@deffector/agent';
```

**Обёртка**, которая заново передаёт этот scope через `DeffectorProvider`:

```tsx
// components/Bridge.tsx
'use client';

import type { ReactNode } from 'react';
import { useProvidedScope } from 'effector-react';
import { DeffectorProvider } from '@deffector/agent/react';

export function Bridge({ children }: { children: ReactNode }) {
  const scope = useProvidedScope();
  if (!scope) return <>{children}</>;
  return (
    <DeffectorProvider value={scope} name="client">
      {children}
    </DeffectorProvider>
  );
}
```

Оберните ей содержимое страницы внутри `EffectorNext`:

```tsx
<EffectorNext values={serialize(scope)}>
  <Bridge>
    <App />
  </Bridge>
</EffectorNext>
```

**Сервер (по желанию):** отправляйте scope каждого запроса в [отдельное приложение](/ru/guide/node-ssr):

```ts
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { attachDeffectorNode } = await import('@deffector/agent/node');
    attachDeffectorNode({ name: 'next (server)', maxTransactions: 2000 });
  }
}
```

```tsx
// app/page.tsx — scope на каждый запрос
import { registerScope } from '@deffector/agent/node';

const scope = fork();
registerScope(scope, { name: `request #${++n}` });
```

Тогда клиент виден в расширении, а сервер — в отдельном приложении.

**`next.config.mjs`:** на сервере должен быть один экземпляр effector, чтобы агент подключился к тому,
который использует приложение:

```js
export default {
  serverExternalPackages: ['effector'],
};
```

Демо в `demo/next-ssr` добавляет в `serverExternalPackages` и собственный пакет с моделью.

## Глобальный режим (без fork)

Если приложение не вызывает `fork()` и рендерится без `Provider`, достаточно одного импорта:

```tsx
import '@deffector/agent';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<App />);
```

Записывается всё, но отрисовать отдельную копию прошлого нельзя. Переход записывает значения прошлого
**на месте** через `launch`, поэтому watchers, `sample` и эффекты на это реагируют; возврат в настоящее
так же записывает текущие значения обратно. Во время перехода панель показывает предупреждение, а
Health сообщает **Глобальный режим: нет fork()**. Воспроизведение подменяет хендлеры эффектов
глобально. **Пропустить** (пересчитать историю без одной транзакции) требует scope и недоступно.

Для надёжного перемещения во времени лучше использовать `fork()`.

## Scope без адаптера

Если приложение использует `fork()`, но рендерится через обычный `Provider` из effector, deffector
видит scope через ядро, но не может отрисовать другой. Переходы тогда записывают значения в живой scope
на месте, а Health показывает **Используется scope, но приложение не обёрнуто в DeffectorProvider**.
Чтобы исправить, замените провайдер.

## Без babel/swc-плагина

deffector работает и без `effector/babel-plugin` или `@effector/swc-plugin`, но с меньшими
подробностями:

- у юнитов нет `sid`: Health предупреждает (**У N из M сторов нет sid**), `serialize(scope)` их
  пропускает, а трейс сопоставляет их только по имени;
- имена берутся только из явной опции `{ name }`; остальные юниты показываются по месту в коде, например
  `$store@index.js:97`;
- для расположения в коде нужен `import 'effector/enable_debug_traces'` (до агента), а он стоит
  производительности;
- юниты не связаны с фабриками, которые их создали, поэтому группировка по фабрике складывает их все в
  «—».

Перемещение во времени в пределах страницы работает так же. С плагином перечислите свои фабрики в его
опции `factories` — тогда у каждого экземпляра будет свой `sid`, а юниты сгруппируются по фабрике.

## Node, SSR и React Native

Код, который выполняется не во вкладке браузера, подключается к отдельному приложению — см.
[Node, SSR, React Native](/ru/guide/node-ssr).
