# NocoDB 前端迁移计划：Nuxt (Vue) → Next.js (React)

## 一、项目分析概览

### 1.1 源项目 (nc-gui - Nuxt/Vue)

**技术栈：**
- **框架**: Nuxt 3.17.4 (Vue 3)
- **状态管理**: Pinia
- **UI 框架**: Ant Design Vue 3.2.20
- **CSS**: WindiCSS + SCSS
- **API 客户端**: nocodb-sdk (axios)
- **国际化**: vue-i18n

**项目规模：**
| 模块 | 数量 | 说明 |
|------|------|------|
| Pages | 53+ | 页面路由 |
| Components | 752+ | UI 组件 |
| Composables | 102+ | 可复用逻辑 |
| Store | 18 | Pinia 状态模块 |
| Layouts | 8 | 布局组件 |
| Utils | 58+ | 工具函数 |
| Plugins | 20 | Nuxt 插件 |

**核心功能模块：**
1. **认证系统** - 登录/注册/忘记密码/SSO
2. **Workspace 管理** - 工作区创建/切换/设置
3. **Base/Database 管理** - 数据库连接/管理
4. **Smartsheet (核心)** - Grid/Gallery/Kanban/Form/Calendar/Map 视图
5. **表单设计器** - 拖拽式表单构建
6. **API 客户端** - API 文档/代码片段生成
7. **权限系统** - 角色/权限管理
8. **扩展系统** - 插件/扩展管理
9. **实时协作** - WebSocket 同步

### 1.2 目标项目 (nocodb-ui - Next.js/React)

**技术栈：**
- **框架**: Next.js 16.1.1 (React 19)
- **CSS**: TailwindCSS 4
- **图标**: Lucide React
- **API**: axios + nocodb-sdk

**已完成迁移：**
| 模块 | 状态 | 说明 |
|------|------|------|
| useGlobal | ✅ 完成 | 全局状态管理 (Context API) |
| useApi | ✅ 完成 | API 调用封装 |
| useAuth | ✅ 完成 | 认证逻辑 |
| SignIn 页面 | ✅ 完成 | 登录页面 |
| SignUp 页面 | ✅ 完成 | 注册页面 |
| Forgot Password | ✅ 完成 | 忘记密码页面 |
| AuthGuard | ✅ 完成 | 路由守卫 |
| Workspace Layout | ✅ 完成 | 工作区布局 |
| Sidebar | ✅ 完成 | 侧边栏组件 |
| Header | ✅ 完成 | 顶部导航 |
| Button/Input | ✅ 完成 | 基础 UI 组件 |

---

## 二、迁移策略

### 2.1 分阶段迁移原则

1. **功能优先级**: 核心功能 → 辅助功能 → 增强功能
2. **依赖关系**: 基础模块 → 业务模块 → 复杂功能
3. **可测试性**: 每个阶段完成后可独立运行测试
4. **渐进增强**: 保持 UI/UX 一致性

### 2.2 Vue → React 对应关系

| Vue 概念 | React 对应 | 说明 |
|----------|-----------|------|
| `ref()` | `useState()` | 响应式状态 |
| `computed()` | `useMemo()` | 计算属性 |
| `watch()` | `useEffect()` | 副作用 |
| `provide/inject` | `Context API` | 依赖注入 |
| Pinia Store | Context + useReducer 或 Zustand | 全局状态 |
| Composables | Custom Hooks | 可复用逻辑 |
| `v-model` | `value + onChange` | 双向绑定 |
| `v-if/v-else` | `{condition && ...}` 或三元表达式 | 条件渲染 |
| `v-for` | `.map()` | 列表渲染 |
| Slots | `children` / render props | 插槽 |
| Nuxt `<NuxtPage>` | Next.js `{children}` | 路由出口 |

---

## 三、详细迁移计划

### Phase 1: 基础设施完善 (优先级: 🔴 最高)

**目标**: 完善核心基础设施，为后续迁移做准备

#### 1.1 状态管理增强
- [ ] 创建 `useWorkspace` hook - 工作区状态管理
- [ ] 创建 `useBases` hook - 数据库列表管理
- [ ] 创建 `useTables` hook - 表格列表管理
- [ ] 创建 `useViews` hook - 视图管理

**对应源文件：**
```
nc-gui/store/workspace.ts → nocodb-ui/app/composables/useWorkspace/
nc-gui/store/bases.ts → nocodb-ui/app/composables/useBases/
nc-gui/store/tables.ts → nocodb-ui/app/composables/useTables/
nc-gui/store/views.ts → nocodb-ui/app/composables/useViews/
```

#### 1.2 路由系统
- [ ] 完善动态路由 `[baseId]`
- [ ] 实现路由守卫中间件
- [ ] 添加路由元数据支持

#### 1.3 UI 组件库
- [ ] Modal/Dialog 组件
- [ ] Dropdown/Menu 组件
- [ ] Table 基础组件
- [ ] Form 表单组件
- [ ] Toast/Notification 组件
- [ ] Loading/Spinner 组件
- [ ] Tooltip 组件
- [ ] Tabs 组件

---

### Phase 2: Workspace 功能 (优先级: 🟠 高)

**目标**: 完成工作区管理的完整功能

#### 2.1 Workspace 页面
- [ ] Workspace 列表页面
- [ ] Workspace 设置页面
- [ ] Workspace 成员管理
- [ ] Workspace 创建/编辑弹窗

**对应源文件：**
```
nc-gui/pages/index/[typeOrId]/ → nocodb-ui/app/(workspace)/workspace/
nc-gui/components/workspace/ → nocodb-ui/app/components/workspace/
```

#### 2.2 Base/Database 管理
- [ ] Base 列表展示
- [ ] Base 创建弹窗
- [ ] Base 设置页面
- [ ] 外部数据库连接

**对应源文件：**
```
nc-gui/pages/index/[typeOrId]/[baseId]/ → nocodb-ui/app/(workspace)/workspace/[baseId]/
nc-gui/components/project/ → nocodb-ui/app/components/base/
```

---

### Phase 3: 表格视图核心 (优先级: 🟠 高)

**目标**: 实现核心的 Grid 视图功能

#### 3.1 Smartsheet 基础架构
- [ ] `useSmartsheetStore` hook
- [ ] `useViewData` hook
- [ ] `useViewColumns` hook
- [ ] `useViewFilters` hook
- [ ] `useViewSorts` hook

**对应源文件：**
```
nc-gui/composables/useSmartsheetStore.ts
nc-gui/composables/useViewData.ts
nc-gui/composables/useViewColumns.ts
nc-gui/composables/useViewFilters.ts
nc-gui/composables/useViewSorts.ts
```

#### 3.2 Grid 视图
- [ ] Grid 表格渲染
- [ ] 单元格编辑
- [ ] 行操作 (添加/删除/复制)
- [ ] 列操作 (添加/删除/重排序)
- [ ] 分页/无限滚动

**对应源文件：**
```
nc-gui/components/smartsheet/grid/ → nocodb-ui/app/components/smartsheet/grid/
nc-gui/composables/useGridViewData.ts
nc-gui/composables/useInfiniteData.ts
```

#### 3.3 单元格类型
按优先级排序：
1. [ ] Text/LongText
2. [ ] Number/Decimal
3. [ ] SingleSelect/MultiSelect
4. [ ] Checkbox
5. [ ] Date/DateTime
6. [ ] Email/URL/Phone
7. [ ] Attachment
8. [ ] Link (关联)
9. [ ] Formula
10. [ ] Lookup/Rollup

**对应源文件：**
```
nc-gui/components/cell/ → nocodb-ui/app/components/cell/
nc-gui/components/virtual-cell/ → nocodb-ui/app/components/virtual-cell/
```

---

### Phase 4: 工具栏与筛选 (优先级: 🟡 中)

**目标**: 实现视图工具栏和数据筛选功能

#### 4.1 Toolbar 组件
- [ ] 视图切换
- [ ] 筛选器
- [ ] 排序
- [ ] 隐藏列
- [ ] 分组
- [ ] 搜索

**对应源文件：**
```
nc-gui/components/smartsheet/toolbar/ → nocodb-ui/app/components/smartsheet/toolbar/
```

#### 4.2 筛选系统
- [ ] 筛选条件构建器
- [ ] 多条件筛选
- [ ] 筛选保存/加载

---

### Phase 5: 其他视图类型 (优先级: 🟡 中)

#### 5.1 Gallery 视图
- [ ] 卡片布局
- [ ] 封面图选择
- [ ] 卡片字段配置

**对应源文件：**
```
nc-gui/components/smartsheet/Gallery.vue → nocodb-ui/app/components/smartsheet/Gallery.tsx
```

#### 5.2 Kanban 视图
- [ ] 看板布局
- [ ] 拖拽排序
- [ ] 分组配置

**对应源文件：**
```
nc-gui/components/smartsheet/Kanban.vue → nocodb-ui/app/components/smartsheet/Kanban.tsx
nc-gui/composables/useKanbanViewStore.ts
```

#### 5.3 Form 视图
- [ ] 表单渲染
- [ ] 表单提交
- [ ] 表单设计器

**对应源文件：**
```
nc-gui/components/smartsheet/Form.vue → nocodb-ui/app/components/smartsheet/Form.tsx
nc-gui/composables/useFormViewStore.ts
```

#### 5.4 Calendar 视图
- [ ] 日历布局
- [ ] 事件展示
- [ ] 日期范围选择

**对应源文件：**
```
nc-gui/components/smartsheet/calendar/ → nocodb-ui/app/components/smartsheet/calendar/
nc-gui/composables/useCalendarViewStore.ts
```

---

### Phase 6: 高级功能 (优先级: 🟢 低)

#### 6.1 扩展行详情
- [ ] 详情面板
- [ ] 关联数据展示
- [ ] 评论系统

**对应源文件：**
```
nc-gui/components/smartsheet/expanded-form/ → nocodb-ui/app/components/smartsheet/expanded-form/
nc-gui/composables/useExpandedFormStore.ts
```

#### 6.2 权限系统
- [ ] 角色管理
- [ ] 权限配置
- [ ] 共享视图

#### 6.3 实时协作
- [ ] WebSocket 连接
- [ ] 实时数据同步
- [ ] 在线用户显示

#### 6.4 API 客户端
- [ ] API 文档生成
- [ ] 代码片段

---

## 四、每个迁移阶段的详细步骤

### 迁移单个 Composable 的步骤

1. **分析源代码**
   ```bash
   # 阅读 Vue composable
   cat nc-gui/composables/useXxx.ts
   ```

2. **识别依赖**
   - 其他 composables
   - Store 模块
   - API 调用
   - 工具函数

3. **创建 React Hook**
   ```typescript
   // nocodb-ui/app/composables/useXxx/index.ts
   export function useXxx() {
     // 转换 ref → useState
     // 转换 computed → useMemo
     // 转换 watch → useEffect
   }
   ```

4. **测试验证**
   - 单元测试
   - 集成测试

### 迁移单个组件的步骤

1. **分析 Vue 组件**
   - Props 定义
   - Emits 事件
   - Slots 插槽
   - 模板结构
   - 样式

2. **创建 React 组件**
   ```tsx
   interface XxxProps {
     // 从 Vue props 转换
   }
   
   export function Xxx({ ...props }: XxxProps) {
     // 转换逻辑
     return (
       // 转换模板
     )
   }
   ```

3. **样式迁移**
   - SCSS → TailwindCSS
   - WindiCSS → TailwindCSS

---

## 五、推荐的下一步行动

### 立即开始 (Phase 1.1)

**创建 `useWorkspace` hook：**

```
源文件: nc-gui/store/workspace.ts (8679 bytes)
目标: nocodb-ui/app/composables/useWorkspace/
```

**需要迁移的核心功能：**
1. 获取当前工作区
2. 切换工作区
3. 工作区列表
4. 工作区 CRUD

### 建议的文件结构

```
nocodb-ui/app/
├── (auth)/                    # 认证路由组 ✅
├── (workspace)/               # 工作区路由组
│   ├── layout.tsx            ✅
│   └── workspace/
│       ├── page.tsx          ✅
│       ├── [baseId]/
│       │   ├── page.tsx      # 待创建
│       │   └── [tableId]/
│       │       └── page.tsx  # 待创建
│       ├── members/
│       └── settings/
├── components/
│   ├── auth/                 ✅
│   ├── ui/                   ✅ (需扩展)
│   ├── workspace/            ✅ (需扩展)
│   ├── base/                 # 待创建
│   ├── smartsheet/           # 待创建 (核心)
│   │   ├── grid/
│   │   ├── gallery/
│   │   ├── kanban/
│   │   ├── form/
│   │   ├── calendar/
│   │   ├── toolbar/
│   │   └── cell/
│   └── shared/               # 待创建
├── composables/
│   ├── useApi/               ✅
│   ├── useAuth/              ✅
│   ├── useGlobal/            ✅
│   ├── useWorkspace/         # 待创建
│   ├── useBases/             # 待创建
│   ├── useTables/            # 待创建
│   ├── useViews/             # 待创建
│   └── useSmartsheet/        # 待创建
├── lib/
│   ├── api.ts                ✅
│   ├── validation.ts         ✅
│   └── utils/                # 待创建
└── types/                    # 待创建
```

---

## 六、技术注意事项

### 6.1 需要替换的 Vue 特定库

| Vue 库 | React 替代 |
|--------|-----------|
| ant-design-vue | Radix UI / shadcn/ui |
| @vueuse/core | React 原生 hooks / react-use |
| vue-i18n | next-intl / react-i18next |
| pinia | Zustand / Jotai / Context API |
| vuedraggable | @dnd-kit/core |
| vue-flow | reactflow |
| @tiptap/vue-3 | @tiptap/react |

### 6.2 保持不变的库

- `nocodb-sdk` - API 客户端
- `dayjs` - 日期处理
- `xlsx` - Excel 处理
- `papaparse` - CSV 解析
- `socket.io-client` - WebSocket
- `monaco-editor` - 代码编辑器

---

## 七、进度跟踪

### 已完成 ✅
- [x] 项目初始化
- [x] useGlobal (全局状态)
- [x] useApi (API 调用)
- [x] useAuth (认证)
- [x] 登录页面
- [x] 注册页面
- [x] 忘记密码页面
- [x] Workspace 布局
- [x] Sidebar 组件
- [x] Header 组件
- [x] Button/Input 组件
- [x] **Phase 1.1**: useWorkspace hook
- [x] **Phase 1.2**: useBases hook
- [x] **Phase 1.3**: 集成 Providers 到应用布局
- [x] **Phase 1.4**: Workspace 页面使用新 hooks (展示 bases 列表)
- [x] **Phase 1.5**: UI 组件库扩展 (Modal, ConfirmModal, Dropdown)

### 进行中 🔄
- [ ] Phase 2: Workspace 功能完善

### 待开始 ⏳
- [ ] Phase 3: 表格视图核心
- [ ] Phase 4: 工具栏与筛选
- [ ] Phase 5: 其他视图类型
- [ ] Phase 6: 高级功能

---

**文档版本**: 1.0  
**创建日期**: 2026-01-06  
**最后更新**: 2026-01-06
