---
name: enterprise-ui-layout-quality
description: 适用于企业级 SaaS、后台管理系统、数据看板、统计分析页、工作台、列表详情页和业务管理页开发。要求使用稳定的 CSS Grid、统一间距、等高卡片、响应式布局，避免 1440px 和 1920px 下出现错乱、空白或孤立掉行。
---

# 企业级 UI 布局质量

## 使用时机

修改包含筛选区、KPI 指标卡、图表、表格、详情面板、侧边栏或数据看板的页面前，先阅读并遵守本 Skill。

## 核心规则

- 页面主内容区使用统一容器，主要模块之间统一 16px gap。
- 筛选区、指标区、图表区、表格区、详情区必须对齐到同一套栅格。
- KPI 和看板卡片禁止依赖不受控的 `flex-wrap`。
- KPI 卡片必须使用 CSS Grid，并明确列数。
- 10 个 KPI 必须排成 5 列 x 2 行。
- 8 个 KPI 优先排成 4 列 x 2 行。
- 6 个 KPI 优先排成 6 列，或 3 列 x 2 行，不能出现 5 + 1。
- 同一行图表卡片必须等高。
- 左右栏比例要稳定，常用比例：`2fr 1fr`、`280px 1fr 380px`、`320px 1fr 400px`。
- 包含表格、图表、长文本的 grid 子元素必须设置 `min-width: 0`。
- 不允许整页横向滚动；宽表格只能在表格容器内部横向滚动。

## 推荐 CSS

```css
.page-content {
  min-width: 0;
  padding: 20px 24px 28px;
}

.layout-stack {
  display: grid;
  gap: 16px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(140px, 1fr));
  gap: 12px;
  align-items: end;
}

.kpi-grid-10 {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}

.chart-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.three-panel-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 380px;
  gap: 16px;
}

.table-scroll {
  width: 100%;
  min-width: 0;
  overflow-x: auto;
}
```

## 明确禁止

- 第一行很多 KPI，第二行只剩一个孤立卡片。
- 同一行图表卡片高度不一致。
- 筛选区无规划地变成多行大表单。
- 因为 `max-width` 太窄或栅格比例错误产生大面积空白。
- 表格撑破页面，导致整页横向滚动。
- 文本、按钮、图表或图片溢出卡片。

## 验收

- 检查 1440px 和 1920px 宽度。
- 没有孤立掉行的卡片。
- 图表卡片等高。
- 主要区域之间保持 16px 间距。
- 表格只在自身容器内滚动。
- 如修改了代码，运行项目构建命令。
