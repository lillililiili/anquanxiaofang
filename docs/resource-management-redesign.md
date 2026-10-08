# 资源管理模块改版说明

## 页面与业务关系

本版接入现有深蓝主题与侧栏，客户、项目、设备、检查模板共用资源台账，系统管理汇总这些操作的记录。

| 模块 | 本版页面内容 | 主要操作 |
| --- | --- | --- |
| 客户管理 | 服务统计、企业台账、服务跟进、类型分布、档案详情 | 筛选、创建和编辑档案、查看关联项目、导出 |
| 项目管理 | 项目统计、列表与卡片、检查覆盖率、近期安排、四类详情页签 | 新建和编辑、点位登记、设备配属入口、选择已发布模板 |
| 设备管理 | 20 条原设备资料、状态与供电统计、台账、设备详情、维护记录 | 筛选、新增和编辑、绑定和解绑、检查记录、演示维护工单 |
| 检查模板 | 六类场景、32 个检查项、证据要求、版本与引用项目 | 草稿编辑、复制、新版本、发布校验、引用保护、预览和导出 |
| 系统管理 | 成员与组织、角色与数据范围、通知规则、统一操作日志 | 成员维护、权限依赖配置、提醒预览、日志筛选和导出 |

关系为客户 → 多个项目，项目 → 检查点位、绑定设备、指定模板版本。设备解绑立即反映到项目数量；模板发布新版本后，项目继续引用原版本，用户可在项目档案主动更换。

## 数据边界

- 资源台账使用本机浏览器保存的演示数据，现有任务、隐患和运营看板的历史汇总数据仍由原模块管理。
- 设备在线、电量及上报时间保留演示快照；重启和升级是本地维护流程，不向真实硬件发送命令。
- 成员角色不启用真实鉴权；通知规则不连接调度或发送服务。
- 缓存结构校验覆盖嵌套记录。格式异常的原缓存先保留，后续保存前备份；存储失败明确提示。
- 标签页之间同步资源台账，保存基于最新缓存。该机制用于本机演示，不替代后端事务和多人协作冲突控制。

## 代码变更说明

文件路径以项目根目录为基准。未改动的既有全局主题调整不计入本次变更。

| 改动文件/类 | 改动方法/函数 | 方法作用与本次修改的代码作用 |
| --- | --- | --- |
| `src/App.tsx` | `App`、`navigateResource`、`navigate`、路由同步 | 将五个入口指向新模块，携带客户、项目、设备及模板定位条件；清理旧全局无效筛选。 |
| `src/main.tsx` | 入口渲染 | 装配 `ResourceProvider` 与资源样式。 |
| `src/features/resources/ResourceModules.tsx` | `ResourceModules` | 统一路由分发及存储状态提示。 |
| `src/features/resources/CustomersPage.tsx` | `CustomersPage`、`save`、`remainingDays`、`serviceLabel` | 客户档案、服务筛选及关联详情；校验空白与重复输入，按本地日历计算到期状态。 |
| `src/features/resources/ProjectsPage.tsx` | `ProjectsPage`、`save`、`addPoint`、`coverage`、定位 effect | 项目列表/卡片、检查方案和点位维护；按客户筛选及跨模块跳转。 |
| `src/features/resources/DevicesPage.tsx` | `DevicesPage`、`saveDevice`、`runAction`、`exportDevices`、定位 effect | 设备资料、配属与维护流程；支持设备 ID 定位和项目筛选入口。 |
| `src/features/resources/TemplatesPage.tsx` | `TemplatesPage`、`saveMetadata`、`saveItem`、`copyTemplate`、`publish`、`publishErrors`、`toggleActive`、`removeItem`、`exportSelected` | 场景检查项、草稿和版本生命周期；已被项目使用的版本禁止直接停用。 |
| `src/features/resources/SettingsPage.tsx` | `SettingsPage`、`MemberEditor`、`RoleEditor`、`RuleEditor`、保存和启停方法 | 组织成员、角色权限依赖、提醒规则和日志；保留当前演示管理员配置。 |
| `src/features/resources/ResourceContext.tsx` | `ResourceProvider`、`change`、`loadInitial`、`readSnapshot`、`applyOperations`、`useResources`、`makeId` | 共享本地状态、审计日志、缓存恢复与标签页同步；避免旧快照整份覆盖其他标签页的修改。 |
| `src/features/resources/resourceValidation.ts` | `isResourceState`、`parseResourceSnapshot` | 验证记录字段、枚举、嵌套数组与 ID，拦截不完整缓存。 |
| `src/features/resources/ResourceUI.tsx` | `RMHeader`、`RMStats`、`RMPanel`、`RMBadge`、`RMTable`、`RMDialog`、`RMTabs`、`RMEmpty`、`RMProgress`、`ResourceDataNote`、`downloadCsv` | 统一统计卡、表格、原生弹窗、状态与导出；CSV 转义并处理公式前缀。 |
| `src/features/resources/resourceTypes.ts` | 无具体方法 | 定义八类资源记录与模块导航契约。 |
| `src/features/resources/resources.css`、`DevicesPage.css`、`TemplatesPage.css`、`SettingsPage.css` | 无具体方法 | 深蓝页面、响应式网格、表格内部滚动、详情与表单布局；修正搜索图标间距。后三个文件同属 `src/features/resources/`。 |
| `src/data/mockData.ts` | 无具体方法，资源种子导出 | 保留既有预览数据，并导出新资源台账。 |
| `src/data/resourceCustomerProjectData.ts`、`resourceDeviceData.ts`、`resourceTemplateData.ts`、`resourceSettingsData.ts` | 无具体方法，演示数据常量 | 提供关联客户项目、原设备资料、不同检查场景以及成员角色规则。后三个文件同属 `src/data/`。 |

## 已完成验证

- 浏览器验证客户 → 项目 → 项目设备的筛选链路。
- 点位勾选由 60% 更新至 80%，总点位记录同步；已恢复原演示记录。
- 设备检查可写入维护记录，并在系统操作日志查到。
- 模板场景切换展示不同检查项，草稿检查项可保存；正在使用的版本不能直接停用。
- 通知阈值保存后刷新保留，已恢复原值；角色取消查看权限会同步取消维护和导出。
- 双标签顺序保存验证通过：设备记录不会覆盖另一标签已保存的规则；未编辑的规则表单自动更新，有草稿时提示外部变化，“重置修改”载入最新值。
- 缓存及状态合并完成 10 组定向验证：嵌套数据校验、旧标签保存、storage 同步、异常备份、写入失败保留修改及重试日志去重等。
- 项目无匹配结果时显示空态；卡片模式展示 8 个项目；纯空格名称被表单拦截。
- 日期边界与文本校验定向验证通过：45 条日期/状态断言、33 条空白输入用例。
- 约 1440 与 1920 桌面布局逐页检查。受浏览器缩放换算影响，实测宽度分别为 1439 和 1920 CSS 像素；全部页面 `scrollWidth === clientWidth`，各页 KPI 等高且同排。
- 截图和布局数据保存在 `output/resource-redesign/`；浏览器检查时未记录控制台 error。

## 构建与运行验证

2026-09-23 执行 `npm.cmd run build` 通过（TypeScript 与 Vite）。保留一条分包体积提示：共享产物约 576 kB，尚未专门做加载性能优化。

使用项目自带 stop/start 脚本完成重启。前端 5189、后端 8080 已监听；首页、五个资源页面及 `/api/health` 均返回 HTTP 200。重启后实际打开项目管理页并再次验证通知表单同步，浏览器未记录 error。

运行地址：`http://127.0.0.1:5189/projects`。
