import { defineUserConfig } from "vuepress";
import recoTheme from "vuepress-theme-reco";
import { viteBundler } from '@vuepress/bundler-vite'
import { registerComponentsPlugin } from '@vuepress/plugin-register-components';
import path from 'path';
import { webpackBundler } from '@vuepress/bundler-webpack'
import { mediumZoomPlugin } from '@vuepress/plugin-medium-zoom'


export default defineUserConfig({
  title: "全系列技术体系",
  description: "Just playing around",
  bundler: viteBundler(),
  // bundler: webpackBundler(),
  theme: recoTheme({
    logo: "/logo.png",
    author: "hl",
    catalogTitle: "目录",
    authorAvatar: "/head.png",
    docsRepo: "https://github.com/vuepress-reco/vuepress-theme-reco-next",
    docsBranch: "main",
    docsDir: "example",
    lastUpdatedText: "",
    // home: './components/MyFooter.vue',
    // series 为原 sidebar
    series: {
      "/docs/Java/base/": [
        {
          text: "Java 基础",
          children: ["Java 面向对象","Java 知识点","Java 泛型机制详解","Java 注解机制详解","Java 异常机制详解","Java 反射机制详解","Java SPI机制详解",],
        },
        {
          text: "Java 集合框架",
          children: [
            {
              text: "Collection - 源码解析",
              children: [
                "Collection 类关系图","ArrayList 源码解析","LinkedList源码解析",
                "Stack & Queue 源码解析","PriorityQueue源码解析"
              ]
            },
            {
              text: "Map - 源码解析",
              children: [
                "HashSet & HashMap 源码解析",
                "LinkedHashSet&Map源码解析","TreeSet & TreeMap 源码解析","WeakHashMap源码解析"]
            },
              ],
        },
        {
          text: "Java 多线程与并发",
          children: [
            {
              text: "Java 并发基础",
              children: ["Java 并发 - 理论基础","Java 并发 - 线程基础"]
            },
            "Java并发 - Java中的锁","synchronized详解","volatile详解",
            "final详解","JUC 锁","JUC 集合","JUC 线程池","JUC 工具类"],
        },
        {
          text: "Java IO/NIO/AIO",
          children: ["Java 并发 - 理论基础","Java 并发 - 线程基础",
            "Java并发 - Java中的锁","synchronized详解","volatile详解",
            "final详解","JUC 锁","JUC 集合","JUC 线程池","JUC 工具类"],
        },
      ],
      "/docs/db/mysql/": [
        {
          text: "SQL - MySQL",
          children: ["MySQL","MySQL数据类型","MySQL执行流程","MySQL基础架构","MySQL索引","MySQL性能优化","MySQL事务"],
        },
      ],
    },
    navbar: [
      { text: "首页", link: "/" },
      {
        text: "Java",
        children: [
          {
            text: "Java 面向对象和基础",
            children: [
              { text: "Java 面向对象和基础", link: "/docs/Java/base/Java 面向对象" },
              { text: "Java 基础知识体系", link: "/docs/Java/base/Java 知识点" },
              { text: "Java 集合框架详解", link: "/docs/Java/base/Collection 类关系图" }
            ],
          },
          {
            text: "Java进阶 - 并发框架",
            children: [
              { text: "Java 并发理论基础", link: "/docs/Java/base/Java 并发 - 理论基础" },
              { text: "Java 并发线程基础", link: "/docs/Java/base/Java 并发 - 线程基础" },
            ],
          },
          {
            text: "Java进阶 - IO框架",
            children: [
              { text: "Java IO/NIO/AIO详解", link: "/docs/theme-reco/theme" }
            ],
          },
          {
            text: "Java进阶 - 新版本特性",
            children: [
              { text: "Java 8特性详解", link: "/docs/theme-reco/theme" },
              { text: "Java 8以上版本特性体系", link: "/docs/theme-reco/theme" },
              { text: "Java 8升Java 11特性必读", link: "/docs/theme-reco/theme" },
              { text: "Java 11升Java 17特性必读", link: "/docs/theme-reco/theme" },
            ],
          },
          {
            text: "Java进阶 - JVM相关",
            children: [
              { text: "Java 类加载机制", link: "/docs/theme-reco/theme" },
              { text: "Java 字节码和增强技术", link: "/docs/theme-reco/theme" },
              { text: "JVM 内存结构详解", link: "/docs/theme-reco/theme" },
              { text: "JVM 垃圾回收机制", link: "/docs/theme-reco/theme" },
              { text: "Java 调试排错相关", link: "/docs/theme-reco/theme" },
            ],
          },
        ],
      },
      { text: "算法", link: "/docs/db" },
      {
        text: "数据库",
        children: [
            {
              text: "数据库基础和原理",
              children: [
                { text: "数据库原理", link: "/docs/db/base/database" },
                { text: "SQL语言", link: "/docs/db/base/sql" }
              ]
            },
          {
            text: "SQL数据库",
            children: [
              { text: "MySQL", link: "/docs/db/mysql/MySQL" }
            ]
          },
          {
            text: "NoSQL数据库",
            children: [
              { text: "Redis", link: "/docs/db/redis/redis" },
              { text: "MongoDB", link: "/docs/db/mongodb/mongodb" },
              { text: "ElasticSearch", link: "/docs/db/elasticsearch/elasticsearch" },
            ]
          }
        ]
      },
      { text: "Spring", link: "/Spring" },
      {
        text: "中间件",
        children: [
          { text: "Netty", link: "/docs/middleware/Netty" },
          { text: "缓存中间件", link: "/docs/db/cache/redis" },
        ]
      },
      { text: "Categories", link: "/categories/reco/1.html" },
      { text: "Tags", link: "/tags/tag1/1.html" },
      { text: "Travel Memories", link: "/travel-memories/" },
    ],
    bulletin: {
      body: [
        {
          type: "text",
          content: `🎉🎉🎉 reco 主题 2.x 已经接近 Beta 版本，在发布 Latest 版本之前不会再有大的更新，大家可以尽情尝鲜了，并且希望大家在 QQ 群和 GitHub 踊跃反馈使用体验，我会在第一时间响应。`,
          style: "font-size: 12px;",
        },
        {
          type: "hr",
        },
        {
          type: "title",
          content: "QQ 群",
        },
        {
          type: "text",
          content: `
          <ul>
            <li>QQ群1：1037296104</li>
            <li>QQ群2：1061561395</li>
            <li>QQ群3：962687802</li>
          </ul>`,
          style: "font-size: 12px;",
        },
        {
          type: "hr",
        },
        {
          type: "title",
          content: "GitHub",
        },
        {
          type: "text",
          content: `
          <ul>
            <li><a href="https://github.com/vuepress-reco/vuepress-theme-reco-next/issues">Issues<a/></li>
            <li><a href="https://github.com/vuepress-reco/vuepress-theme-reco-next/discussions/1">Discussions<a/></li>
          </ul>`,
          style: "font-size: 12px;",
        },
        {
          type: "hr",
        },
        {
          type: "buttongroup",
          children: [
            {
              text: "打赏",
              link: "/docs/others/donate.html",
            },
          ],
        },
      ],
    },
    commentConfig: {
      type: 'valine',
      // options 与 1.x 的 valineConfig 配置一致
      options: {
        // appId: 'xxx',
        // appKey: 'xxx',
        // placeholder: '填写邮箱可以收到回复提醒哦！',
        // verify: true, // 验证码服务
        // notify: true,
        // recordIP: true,
        // hideComments: true // 隐藏评论
      },
    },
  }),
  plugins: [
    registerComponentsPlugin({
      componentsDir: path.resolve(__dirname, './components'),
    }),
    mediumZoomPlugin({
      selector: 'img.zoom-custom-imgs', // default
    })

  ],
  debug: true,
  markdown: {
    headers: {
      level: [2, 3, 4],
      shouldAllowNested: true,
    }
  }

});
