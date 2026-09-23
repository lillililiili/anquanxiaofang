# UI Typography Quality Skill

## 适用场景

每次修改前端页面、表格、详情面板、表单、卡片、导航、弹窗、按钮、标签前，必须遵守本 Skill。

## 字体层级

- 页面标题：22px / 600
- 卡片标题：16px / 600
- 表头：13px / 600
- 表格正文：13px / 400
- 普通正文：13px 或 14px / 400
- 表单 label：13px / 500
- 表单 value：13px / 400
- 辅助说明：12px 或 13px / 400
- KPI 数字：30px 或 32px / 700

## 字重规则

禁止大面积使用：

- `font-bold`
- `font-extrabold`
- `font-black`
- `text-black`
- `text-slate-950`
- `font-weight: 800`
- `font-weight: 900`

允许加粗的位置：

- 页面标题
- 卡片标题
- 表头
- 选中导航
- KPI 主数字
- 少量关键状态值

表格正文、详情 value、普通说明文字不得使用粗体。

## 表格文字

- 表格正文必须轻量，避免看起来像全表加粗。
- 长文本使用单行 ellipsis 或最多两行截断。
- 不允许文字被挤成竖排。
- 操作列按钮使用蓝色文字按钮或轻量按钮。
- 表格必须有稳定列宽，优先用 `colgroup`。

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

- 主按钮统一蓝色。
- 次按钮使用白底蓝边或浅蓝底。
- 不使用绿色作为主按钮，绿色只表达成功状态。
- 风险标签统一：
  - 高风险：红色
  - 中风险：橙色
  - 低风险：绿色
- 标签使用轻量底色和轻量字重，不使用大块深色实心标签。

## 验收

- 页面没有大面积黑粗文字。
- 表格正文不加粗。
- 表头、标题、正文层级清楚。
- 长文本不撑破布局。
- 1440px 和 1920px 下文字不重叠、不竖排。
- `npm run build` 通过。
