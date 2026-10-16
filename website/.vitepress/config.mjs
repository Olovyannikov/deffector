import { defineConfig } from 'vitepress';

// GitHub Pages serves a project site from /<repo>/; set DOCS_BASE=/ for a custom domain
const base = process.env.DOCS_BASE || '/deffector/';
const repo = 'https://github.com/mxmvshnvsk/deffector';

function sidebarEn() {
  return [
    {
      text: 'Guide',
      items: [
        { text: 'Introduction', link: '/guide/introduction' },
        { text: 'Installation', link: '/guide/installation' },
        { text: 'Quick start', link: '/guide/quick-start' },
        { text: 'Frameworks', link: '/guide/frameworks' },
        { text: 'Node, SSR, React Native', link: '/guide/node-ssr' },
      ],
    },
    {
      text: 'Panel tour',
      items: [
        { text: 'Log', link: '/panel/log' },
        { text: 'Time travel', link: '/panel/time-travel' },
        { text: 'Stores', link: '/panel/stores' },
        { text: 'Effects', link: '/panel/effects' },
        { text: 'Graph', link: '/panel/graph' },
        { text: 'Traces', link: '/panel/traces' },
        { text: 'Health', link: '/panel/health' },
        { text: 'Command palette', link: '/panel/palette' },
        { text: 'Saved filters', link: '/panel/filters' },
      ],
    },
    {
      text: 'Reference',
      items: [
        { text: 'Configuration', link: '/reference/configuration' },
        { text: 'Performance', link: '/reference/performance' },
        { text: 'Demos', link: '/reference/demos' },
        { text: 'Upstream effector PRs', link: '/reference/upstream' },
        { text: 'FAQ and troubleshooting', link: '/reference/faq' },
        { text: 'Contributing', link: '/reference/contributing' },
      ],
    },
  ];
}

function sidebarRu() {
  return [
    {
      text: 'Руководство',
      items: [
        { text: 'Введение', link: '/ru/guide/introduction' },
        { text: 'Установка', link: '/ru/guide/installation' },
        { text: 'Быстрый старт', link: '/ru/guide/quick-start' },
        { text: 'Фреймворки', link: '/ru/guide/frameworks' },
        { text: 'Node, SSR, React Native', link: '/ru/guide/node-ssr' },
      ],
    },
    {
      text: 'Обзор панели',
      items: [
        { text: 'Log', link: '/ru/panel/log' },
        { text: 'Перемещение во времени', link: '/ru/panel/time-travel' },
        { text: 'Stores', link: '/ru/panel/stores' },
        { text: 'Effects', link: '/ru/panel/effects' },
        { text: 'Graph', link: '/ru/panel/graph' },
        { text: 'Traces', link: '/ru/panel/traces' },
        { text: 'Health', link: '/ru/panel/health' },
        { text: 'Палитра команд', link: '/ru/panel/palette' },
        { text: 'Сохранённые фильтры', link: '/ru/panel/filters' },
      ],
    },
    {
      text: 'Справочник',
      items: [
        { text: 'Настройки', link: '/ru/reference/configuration' },
        { text: 'Производительность', link: '/ru/reference/performance' },
        { text: 'Демо', link: '/ru/reference/demos' },
        { text: 'PR в effector', link: '/ru/reference/upstream' },
        { text: 'FAQ и проблемы', link: '/ru/reference/faq' },
        { text: 'Участие в разработке', link: '/ru/reference/contributing' },
      ],
    },
  ];
}

export default defineConfig({
  base,
  title: 'deffector',
  description: 'DevTools for effector: transactions, time travel, state injection, trace replay',
  cleanUrls: true,
  lastUpdated: true,
  // demo addresses (http://localhost:5171 …) are links on purpose; every other dead link fails the build
  ignoreDeadLinks: 'localhostLinks',
  // `head` is not rewritten with `base`, so every path here carries it explicitly
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` }],
    ['link', { rel: 'icon', href: `${base}favicon.ico`, sizes: '48x48' }],
    ['link', { rel: 'apple-touch-icon', href: `${base}apple-touch-icon.png` }],
    ['meta', { name: 'theme-color', content: '#14161D' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'deffector' }],
    ['meta', { property: 'og:title', content: 'deffector — DevTools for effector' }],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'Every user action as one transaction. Time travel, state injection, and traces that replay a teammate’s bug.',
      },
    ],
    // the deployed origin is not known at build time: a path under base
    ['meta', { property: 'og:image', content: `${base}social-preview.png` }],
    ['meta', { property: 'og:image:width', content: '1280' }],
    ['meta', { property: 'og:image:height', content: '640' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: `${base}social-preview.png` }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'deffector',
    outline: { level: [2, 3] },
    socialLinks: [{ icon: 'github', link: repo }],
    search: {
      provider: 'local',
      options: {
        locales: {
          ru: {
            translations: {
              button: { buttonText: 'Поиск', buttonAriaLabel: 'Поиск' },
              modal: {
                displayDetails: 'Показать подробности',
                resetButtonTitle: 'Сбросить поиск',
                backButtonTitle: 'Закрыть поиск',
                noResultsText: 'Ничего не найдено по запросу',
                footer: {
                  selectText: 'выбрать',
                  selectKeyAriaLabel: 'Enter',
                  navigateText: 'перейти',
                  navigateUpKeyAriaLabel: 'стрелка вверх',
                  navigateDownKeyAriaLabel: 'стрелка вниз',
                  closeText: 'закрыть',
                  closeKeyAriaLabel: 'Esc',
                },
              },
            },
          },
        },
      },
    },
  },

  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/introduction', activeMatch: '/guide/' },
          { text: 'Panel', link: '/panel/log', activeMatch: '/panel/' },
          { text: 'Reference', link: '/reference/configuration', activeMatch: '/reference/' },
        ],
        sidebar: {
          '/guide/': sidebarEn(),
          '/panel/': sidebarEn(),
          '/reference/': sidebarEn(),
        },
        editLink: {
          pattern: `${repo}/edit/main/website/:path`,
          text: 'Edit this page on GitHub',
        },
        footer: {
          message: 'Released under the MIT License.',
          copyright: 'deffector — DevTools for effector',
        },
      },
    },
    ru: {
      label: 'Русский',
      lang: 'ru-RU',
      link: '/ru/',
      title: 'deffector',
      description:
        'DevTools для effector: транзакции, перемещение во времени, подмена состояния, воспроизведение трейсов',
      themeConfig: {
        nav: [
          { text: 'Руководство', link: '/ru/guide/introduction', activeMatch: '/ru/guide/' },
          { text: 'Панель', link: '/ru/panel/log', activeMatch: '/ru/panel/' },
          {
            text: 'Справочник',
            link: '/ru/reference/configuration',
            activeMatch: '/ru/reference/',
          },
        ],
        sidebar: {
          '/ru/guide/': sidebarRu(),
          '/ru/panel/': sidebarRu(),
          '/ru/reference/': sidebarRu(),
        },
        editLink: {
          pattern: `${repo}/edit/main/website/:path`,
          text: 'Изменить эту страницу на GitHub',
        },
        footer: {
          message: 'Распространяется по лицензии MIT.',
          copyright: 'deffector — DevTools для effector',
        },
        outline: { label: 'На этой странице', level: [2, 3] },
        docFooter: { prev: 'Предыдущая страница', next: 'Следующая страница' },
        lastUpdated: {
          text: 'Обновлено',
          formatOptions: { dateStyle: 'medium', timeStyle: 'short' },
        },
        langMenuLabel: 'Сменить язык',
        returnToTopLabel: 'Наверх',
        sidebarMenuLabel: 'Меню',
        darkModeSwitchLabel: 'Тема',
        lightModeSwitchTitle: 'Включить светлую тему',
        darkModeSwitchTitle: 'Включить тёмную тему',
        skipToContentLabel: 'Перейти к содержимому',
        notFound: {
          title: 'СТРАНИЦА НЕ НАЙДЕНА',
          quote: 'Такой страницы нет. Возможно, её переименовали или ссылка устарела.',
          linkLabel: 'перейти на главную',
          linkText: 'На главную',
        },
      },
    },
  },
});
