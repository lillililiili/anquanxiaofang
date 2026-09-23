# UI Layout Quality Skill

## 适用场景

每次修改后台看板、统计分析、数据分析、图表页、风险画像、运营工作台、设备管理、隐患管理、模板管理等页面前，必须先遵守本 Skill。

重点页面：

- `/dashboard`
- `/devices`
- `/hazards`
- `/hazards/register`
- `/hazards/rectify`
- `/hazards/overdue`
- `/templates`
- `/expert`
- `/model-center`
- `/model-center/knowledge`
- `/model-center/hazard-graph`
- `/model-center/expert-rules`

## 核心目标

页面必须像成熟政企级 SaaS 系统：栅格稳定、卡片对齐、信息密度适中、无大面积空白、无孤立掉行、1440px 和 1920px 下都稳定。

## 布局规则

- 页面主内容区统一使用 16px gap。
- 筛选栏、指标区、图表区、表格区、详情区必须对齐到统一栅格。
- 不允许随意使用 `flex-wrap` 造成最后一行只有单个卡片。
- KPI 卡片必须使用 CSS Grid。
- 10 个指标卡必须为 5 列 x 2 行。
- 8 个指标卡优先为 4 列 x 2 行。
- 6 个指标卡优先为 6 列或 3 列 x 2 行，不能出现 5 + 1。
- 图表卡片同一行必须等高。
- 左右栏比例必须稳定，常用比例为 `2fr 1fr`、`260px 1fr 360px`、`320px 1fr 380px`。
- 表格和详情区需要 `min-width: 0`，防止内容撑破页面。
- 页面不能出现整页横向滚动，必要时只允许表格内部横向滚动。

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

## 严禁问题

- KPI 一行 9 个，下一行 1 个。
- 图表卡片高低不一。
- 筛选栏和内容区左右边界不齐。
- 右侧详情面板被表格挤压。
- 表格内容被挤成竖排或大段换行。
- 页面出现明显空洞、大面积无效留白。
- 1440px 下横向溢出。

## 验收

- 1440px、1920px 下页面稳定。
- KPI 卡片整齐排列，无孤立卡片。
- 图表卡片等高。
- 筛选栏、指标区、图表区、表格区 gap 统一为 16px。
- 表格内部可滚动，但整页不横向滚动。
- `npm run build` 通过。
