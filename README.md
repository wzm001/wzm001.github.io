# 博客构建

项目基于 Astro 的一个开源博客[模版](https://github.com/CnBarrier404/astro-theme-misthaven)构建。

常用目录：

- /src/content/posts: 文章目录
- /public/images: 文章引用的图片，也可以直接引用在线图片
- /public/pdf: PDF文件资源

网站基于 Github workflow 发布在 Pages，发布配置位于项目的 .github/workflows/ 目录下，推送 main 分支自动触发发布。

本地调试：直接运行 `npm dev run`，然后访问 `localhost:4321` 查看效果。
