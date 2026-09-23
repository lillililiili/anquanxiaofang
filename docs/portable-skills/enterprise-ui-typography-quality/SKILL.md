---
name: enterprise-ui-typography-quality
description: 适用于企业级 SaaS、后台系统中的文字、表格、详情面板、卡片、表单、按钮、标签和状态展示。要求字体克制、表格稳定、按钮颜色统一、风险和状态标签语义清晰。
---

# 企业级 UI 字体与视觉质量

## 字体层级

- 页面标题：22px / 600
- 卡片标题：16px / 600
- 表头：13px / 600
- 表格正文：13px / 400
- 正文：13px 或 14px / 400
- 表单 label：13px / 500
- 表单 value：13px / 400
- 辅助说明：12px 或 13px / 400
- KPI 主数字：30px 或 32px / 700

## 字重规则

不要大面积使用：

- `font-bold`
- `font-extrabold`
- `font-black`
- `text-black`
- `text-slate-950`
- `font-weight: 800`
- `font-weight: 900`

允许加重的位置：

- 页面标题
- 卡片标题
- 表头
- 选中导航
- KPI 主数字
- 少量关键状态值

表格正文、详情 value、普通说明、普通按钮文字不要使用粗体。

## 表格规范

- 表格必须有稳定列宽，优先使用 `colgroup`。
- 宽表格放在内部横向滚动容器中。
- 不允许整页横向滚动。
- 长文本使用单行省略或两行截断。
- 避免列过窄导致文字竖排。
- 操作列宽度稳定，不挤压主要内容。

```css
.table-cell-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-cell-two-line {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 18px;
}
```

## 按钮与标签

- 主按钮统一使用一种蓝色。
- 次按钮使用白底蓝边，或浅蓝底。
- 除非动作本身表达“成功”，否则不要用绿色作为主按钮。
- 风险标签语义统一：
  - 高风险：红色
  - 中风险：橙色
  - 低风险：绿色
- 标签使用浅底色和适中字重，避免大块深色实心标签。

## 验收

- 页面没有大面积黑粗文字。
- 表格正文不加粗。
- 长文本不破坏布局。
- 详情面板 label 和 value 层级清楚。
- 按钮和标签风格统一。
- 检查 1440px 和 1920px 宽度。
