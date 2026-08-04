---
title: "示例文章：使用 Markdown 写作"
description: "展示标题、引用、列表、代码块和提示框等常用 Markdown 元素。"
publishedAt: 2024-06-12
category: "示例"
tags: ["Markdown", "写作"]
draft: false
---

> 这是一篇随主题提供的示例文章，内容仅用于展示排版效果。

Markdown 让作者把注意力留给内容本身。只需少量标记，就能组织标题、列表、链接与代码。

## 文本与引用

正文可以包含 **加粗文字**、_强调文字_，以及指向 [Astro 文档](https://docs.astro.build) 的链接。

> 好的排版不会抢走注意力，而是让阅读自然地继续下去。

## 列表

1. 先确定文章想回答的问题。
2. 写出关键结论和内容结构。
3. 补充例子，最后统一校对。

## 代码块

```ts title="src/config/siteConfig.ts"
export const siteConfig = {
  title: "My Blog",
  description: "Notes, ideas, and everyday life.",
};
```

> [!TIP]
> 将尚未完成的文章设置为 `draft: true`，生产构建时就不会发布它。
