import { defineUserConfig } from "vuepress";
import recoTheme from "vuepress-theme-reco";
import { viteBundler } from '@vuepress/bundler-vite'
import { webpackBundler } from '@vuepress/bundler-webpack'

export default defineUserConfig({
  title: "全系列技术体系",
  description: "Just playing around",
  bundler: viteBundler(),
  // bundler: webpackBundler(),
  theme: recoTheme({
    logo: "/logo.png",
    author: "hl",
    authorAvatar: "/head.png",
    docsRepo: "https://github.com/vuepress-reco/vuepress-theme-reco-next",
    docsBranch: "main",
    docsDir: "example",
    lastUpdatedText: "",
    // series 为原 sidebar
    series: {
      "/docs/theme-reco/": [
        {
          text: "module one",
          children: ["home", "theme"],
        },
        {
          text: "module two",
          children: ["api", "plugin"],
        },
      ],
    },
    navbar: [
      { text: "首页", link: "/" },
      {
        text: "java",
        children: [
          {
            text: "Java 面向对象和基础",
            children: [
              { text: "Java 面向对象和基础", link: "/docs/theme-reco/theme" },
              { text: "Java进阶 - 集合框架", link: "/blogs/other/guide" },
            ],
          },
          {
            text: "Java进阶 - 集合框架",
            children: [
              { text: "Java集合框架详解", link: "/docs/theme-reco/theme" }
            ],
          },
          {
            text: "Java进阶 - 并发框架",
            children: [
              { text: "Java 并发知识体系", link: "/docs/theme-reco/theme" },
              { text: "Java 并发理论基础", link: "/docs/theme-reco/theme" },
              { text: "Java 并发线程基础", link: "/docs/theme-reco/theme" },
              { text: "JUC 知识体系与基础", link: "/docs/theme-reco/theme" }
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
      { text: "算法", link: "/db" },
      { text: "数据库", link: "/" },
      { text: "开发", link: "/" },
      { text: "Spring", link: "/cicd" },
      { text: "框架|中间件", link: "/other" },
      { text: "架构", link: "/other" },
      { text: "Categories", link: "/categories/reco/1.html" },
      { text: "Tags", link: "/tags/tag1/1.html" },
      {
        text: "Docs",
        children: [
          { text: "vuepress-reco", link: "/docs/theme-reco/theme" },
          { text: "vuepress-theme-reco", link: "/blogs/other/guide" },
        ],
      },
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
    // commentConfig: {
    //   type: 'valine',
    //   // options 与 1.x 的 valineConfig 配置一致
    //   options: {
    //     // appId: 'xxx',
    //     // appKey: 'xxx',
    //     // placeholder: '填写邮箱可以收到回复提醒哦！',
    //     // verify: true, // 验证码服务
    //     // notify: true,
    //     // recordIP: true,
    //     // hideComments: true // 隐藏评论
    //   },
    // },
  }),
  // debug: true,

});
