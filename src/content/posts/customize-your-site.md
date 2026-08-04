---
title: "示例文章：定制你的站点"
description: "介绍开始使用主题时常见的配置入口与内容整理方式。"
publishedAt: 2024-06-05
category: "指南"
tags: ["配置", "Astro"]
draft: false
---

> 这是一篇随主题提供的示例文章。文中的名称和设置均为中性演示内容。

安装依赖并启动开发服务器后，可以从站点信息、导航和首页内容开始定制 Misthaven。

## 修改站点信息

站点标题、描述、作者和基础 URL 集中放在 `src/config/` 中。修改时请同时检查公开清单、页脚和隐私页面，确保没有遗留演示信息。

## 添加自己的文章

在 `src/content/posts/` 中创建 Markdown 文件，并按照 `_template.md` 填写 frontmatter。文件名会成为文章 URL 的一部分，因此建议使用简短、稳定且不带空格的名称。

```yaml
title: "我的第一篇文章"
description: "这篇文章的简短摘要。"
publishedAt: 2024-06-19
category: "随笔"
tags: ["开始"]
draft: false
```

## 发布前检查

- 替换示例文章和演示图片。
- 确认站点 URL 与社交链接。
- 运行格式检查、类型检查和生产构建。

完成这些步骤后，Misthaven 就真正成为属于你的博客了。
