---
layout: home

hero:
  name: deffector
  text: DevTools для effector
  tagline: Каждое действие пользователя — одна транзакция. Перемещение во времени, подмена состояния и трейсы, по которым коллега воспроизводит ваш баг.
  image:
    src: /logo.svg
    alt: deffector
  actions:
    - theme: brand
      text: Быстрый старт
      link: /ru/guide/quick-start
    - theme: alt
      text: Что такое deffector?
      link: /ru/guide/introduction
    - theme: alt
      text: GitHub
      link: https://github.com/mxmvshnvsk/deffector

features:
  - title: Одно действие — одна транзакция
    details: Событие и всё, что оно вызвало, — одной строкой в логе, с деревом шагов в том порядке, в котором их выполнило ядро effector. Видны filter, вернувший false, двойные пересчёты, чтение устаревших значений, вызовы вне scope.
    link: /ru/panel/log
    linkText: Log
  - title: Перемещение во времени
    details: Переход к любой транзакции. С fork() приложение показывает форк этого момента, а настоящее не трогается; страница накрыта, чтобы случайный клик не изменил прошлое.
    link: /ru/panel/time-travel
    linkText: Перемещение во времени
  - title: Своё состояние в любом сторе
    details: Значение можно задать «вживую» (попадёт в лог, как allSettled) или тихо, в новом scope. Пресеты целой формы, снимок { sid → значение } с diff перед применением.
    link: /ru/panel/stores
    linkText: Stores
  - title: Эффекты под контролем
    details: Водопад вызовов в духе вкладки Network, ответы не по порядку подсвечены. Эффект можно держать в pending, вернуть значение или ошибку, добавить задержку или подставить свой хендлер.
    link: /ru/panel/effects
    linkText: Effects
  - title: Трейсы, которые воспроизводят баги
    details: Начальное состояние, внешние вызовы и результаты эффектов — в JSON, секреты замаскированы. Коллега воспроизводит его в новом scope без сети или копирует как тест для vitest.
    link: /ru/panel/traces
    linkText: Traces
  - title: Проверки с готовыми исправлениями
    details: Сторы без sid, повторяющиеся sid, утечки юнитов, циклы, устаревшее чтение, запись в производные сторы, чужой инспектор — у каждой проблемы есть объяснение и исправление. Бесконечный цикл обрывается до того, как вкладка зависнет.
    link: /ru/panel/health
    linkText: Health
  - title: Любая конфигурация
    details: React, Vue, Solid, Next.js App Router, Node и SSR, React Native, глобальный режим без fork(), с babel/swc-плагином и без него. Chrome, Edge и Firefox.
    link: /ru/guide/frameworks
    linkText: Фреймворки
  - title: Почти бесплатно, пока DevTools закрыты
    details: Без открытой панели агент перестаёт писать через 10 секунд и стоит примерно как его отсутствие. В продакшен-сборке все точки входа — пустышки.
    link: /ru/reference/performance
    linkText: Производительность
---

## Две строки для начала

```ts
// самый первый импорт приложения
import '@deffector/agent';
```

```tsx
// рендер через провайдер, который deffector умеет переключать (перемещение во времени и воспроизведение)
import { DeffectorProvider } from '@deffector/agent/react';

<DeffectorProvider value={scope} name="client">
  <App />
</DeffectorProvider>;
```

Откройте DevTools → **deffector**.

<Shot name="log" alt="Вкладка Log: транзакции слева, вкладка «Почему» выбранной транзакции справа" />
