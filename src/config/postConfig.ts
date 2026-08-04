export const postConfig = {
  // 预计阅读时长使用的每分钟内容单位数
  readingUnitsPerMinute: 200,

  // 文章内容时效性提示
  outdatedWarning: {
    enabled: true,
    days: 30,
  },

  // TODO: 浏览量统计功能实现后，在此配置数据收集源。
} as const;
