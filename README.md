---
home: true
modules:
  - BannerBrand
  - Blog
  - MdContent
#  - Footer
bannerBrand:
  bgImage: '/bg.svg'
  title: 全栈技术体系
#  description: 你好，世界！
  tagline: Java、Python、前端、数据库、运维、大数据等等
  
  buttons:
    - { text: 面试指南, link: '/docs/guide/introduce' }
    - { text: 知识体系, link: '/docs/style-default-api/introduce', type: 'plain' }
  socialLinks:
    - { icon: 'LogoGithub', link: 'https://github.com/vuepress-reco/vuepress-theme-reco' }
blog:
  socialLinks:
    - { icon: 'LogoGithub', link: 'https://github.com/recoluan' }
isShowTitleInHome: true
actionText: About
actionLink: /views/other/about
---

## 快速开始

**npx**

```bash
# 初始化，并选择 2.x
npx @vuepress-reco/theme-cli init
```

**npm**

```bash
# 初始化，并选择 2.x
npm install @vuepress-reco/theme-cli@1.0.7 -g
theme-cli init
```

**yarn**

```bash
# 初始化，并选择 2.x
yarn global add @vuepress-reco/theme-cli@1.0.7
theme-cli init
```
