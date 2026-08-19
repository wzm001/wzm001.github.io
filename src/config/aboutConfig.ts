export const aboutConfig = {
  pageTitle: "关于",
  pageDescription: "了解 Misthaven 的设计理念、特点与技术栈。",
  hero: {
    eyebrow: "ABOUT JIMMY",
    title: "你好，这里是 Jimmy。",
    description: ["一个练习时长近 10 年的 Java 程序员。", "也做过一些 Agent 的研发工作。"],
  },
  // 联系方式图标来自 Iconify：https://icon-sets.iconify.design/。
  // `icon` 使用“图标集前缀:图标名称”；使用新的图标集前缀时，需要安装对应的 @iconify-json/<prefix> 包。
  links: [
    {
      name: "GitHub",
      icon: "fa7-brands:github",
      url: "https://github.com/wzm001",
    },
  ],
  techStack: {
    title: "技术栈",
    description: "使用过的组件和技术。",
    // 图标来自 Iconify：https://icon-sets.iconify.design/。
    // `icon` 使用“图标集前缀:图标名称”；使用新的图标集前缀时，需要安装对应的 @iconify-json/<prefix> 包。
    items: [
      { icon: "devicon:java", name: "Java" },
      { icon: "devicon:spring", name: "Spring Framework" },
      { icon: "devicon:mysql", name: "MySQL" },
      { icon: "devicon:mongodb", name: "MongoDB" },
      { icon: "devicon:elasticsearch", name: "Elasticsearch" },
      { icon: "devicon:apachekafka", name: "MessageQueue" },
      { icon: "devicon:kubernetes", name: "Kubernetes" },
      { icon: "devicon:hadoop", name: "Hadoop" },
    ],
  },
} as const;
