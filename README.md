# 文档管理系统

一个基于 Nuxt 全栈的文档管理系统，用于管理多个 GitHub 开源项目的帮助文档。支持配置管理、文档更新、构建部署和域名绑定。

## 功能特性

- 📦 多项目管理 - 同时管理多个文档站点
- 🚀 一键部署 - 支持自定义部署步骤
- 📝 部署日志 - 实时查看部署进度和日志
- 🔄 自动更新 - 支持从 GitHub 拉取最新代码
- 🐳 Docker 部署 - 支持容器化部署
- ⚙️ 灵活配置 - 支持多种项目类型（Nuxt、VitePress 等）

## 技术栈

- **前端**: Nuxt 4 + Nuxt UI 4 + Vue 3 + TailwindCSS
- **后端**: Nuxt Server API
- **存储**: JSON 文件存储
- **进程管理**: Node.js child_process
- **部署**: Docker + Docker Compose

## 快速开始

### 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

访问 http://localhost:3000

### Docker 部署

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 项目执行步骤

### 1. 创建项目

1. 点击"新建项目"按钮
2. 填写基本信息：项目名称、描述、GitHub URL、分支、域名、端口
3. 选择预设模板或自定义部署步骤
4. 点击"创建项目"

### 2. 配置部署步骤

每个项目可以配置多个部署步骤，系统会按顺序执行：

| 步骤类型 | 说明 | 需要命令 |
|---------|------|---------|
| Git克隆 | 首次 clone，后续 pull | 否 |
| Shell命令 | 执行任意 shell 命令 | 是 |
| 关闭进程 | 关闭之前运行的服务进程 | 否 |
| 启动服务 | 启动文档服务 | 是 |

### 3. 部署项目

- 在项目列表页或详情页点击"部署"按钮
- 系统会按配置的步骤顺序执行
- 实时查看部署日志
- 部署成功后可通过配置的域名和端口访问

### 4. 停止服务

- 点击"停止"按钮关闭运行中的服务
- 系统会自动 kill 对应的进程

## 如何自定义项目步骤

### 方法一：使用预设模板

在创建项目时选择预设模板：
- **Nuxt 项目**：适用于 Nuxt 3/4 文档站点
- **Nuxt UI 项目**：适用于 Nuxt UI 文档站点（包含 dev:prepare 步骤）
- **Demo 项目**：测试用的示例配置
- **静态站点**：仅构建，不启动服务
- **自定义**：完全自定义部署步骤

### 方法二：在 `shared/types/project.ts` 中编写自定义模板

```typescript
{
  key: 'my-custom-template',
  name: '我的自定义模板',
  description: '适用于 xxx 项目',
  steps: [
    { name: '下载/更新代码', type: 'git_clone', enabled: true, order: 1 },
    { name: '安装依赖', type: 'shell', command: 'pnpm install', enabled: true, order: 2 },
    { name: '生成类型', type: 'shell', command: 'pnpm dev:prepare', enabled: true, order: 3 },
    { name: '构建项目', type: 'shell', command: 'pnpm build', enabled: true, order: 4 },
    { name: '关闭旧进程', type: 'kill_process', enabled: true, order: 5 },
    { name: '启动服务', type: 'start_service', command: 'node .output/server/index.mjs', enabled: true, order: 6 },
  ]
}
```

### 方法三：前端界面手动配置

1. 选择"自定义"模板
2. 点击"添加步骤"
3. 配置每个步骤的名称、类型、命令
4. 拖拽调整顺序
5. 启用/禁用步骤

## 扩展新的步骤类型

如需添加新的步骤类型，需要修改以下文件：

### 1. 添加类型定义

在 `shared/types/project.ts` 中添加新的类型：

```typescript
export type DeployStepType = 'git_clone' | 'shell' | 'kill_process' | 'start_service' | 'my_new_type'
```

### 2. 实现步骤逻辑

在 `server/utils/steps.ts` 中添加新的执行函数：

```typescript
async function executeMyNewTypeStep(
  step: DeployStep,
  context: DeployContext
): Promise<StepResult> {
  try {
    // 实现步骤逻辑
    return {
      success: true,
      output: '执行成功',
    }
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
```

### 3. 注册到执行器

在 `executeStep` 函数中添加 case：

```typescript
case 'my_new_type':
  return executeMyNewTypeStep(step, context)
```

### 4. 前端添加选项

在 `StepEditor.vue` 中添加新的选项：

```typescript
const stepTypeOptions = [
  { label: 'Git克隆', value: 'git_clone' },
  { label: 'Shell命令', value: 'shell' },
  { label: '关闭进程', value: 'kill_process' },
  { label: '启动服务', value: 'start_service' },
  { label: '我的新类型', value: 'my_new_type' },
]
```

## 项目数据管理

### 项目 Clone 位置

项目代码克隆到 `projects/` 目录下，以项目 ID 为子目录名：

```
projects/
├── abc123/          # 项目1的代码
├── def456/          # 项目2的代码
└── ...
```

### 版本保留策略

- **Git 历史保留**：使用 `git pull` 更新代码，保留完整的 Git 历史
- **不会自动删除**：已克隆的项目不会自动删除，除非手动删除项目
- **磁盘空间管理**：如需清理，可手动删除 `projects/` 下的目录

### 配置文件位置

```
server/data/
├── projects.json      # 项目配置
└── deploy-logs.json   # 部署日志
```

### 日志管理

- **部署日志**：保存在 `server/data/deploy-logs.json`
- **控制台日志**：Docker 日志可通过 `docker-compose logs` 查看
- **自动刷新**：前端每 500ms 自动刷新日志
- **日志限制**：API 默认返回最近 50 条日志，可在项目详情页查看

### 自动清理机制

目前**没有自动删除机制**，需要注意：

1. **项目代码**：不会自动清理，长期运行可能占用大量磁盘空间
2. **部署日志**：不会自动清理，文件可能逐渐增大
3. **建议**：定期手动清理不需要的项目和日志文件

## 端口和域名工作原理

### 本地开发环境

```
管理后台: http://localhost:3000
项目1:    http://localhost:3001  (配置 domain: localhost, port: 3001)
项目2:    http://localhost:3002  (配置 domain: localhost, port: 3002)
```

### Docker 部署环境

```yaml
# docker-compose.yml
ports:
  - "3000:3000"        # 管理后台
  - "3001-3100:3001-3100"  # 项目服务端口范围
```

**工作原理**：

1. **管理后台**：通过 3000 端口访问管理界面
2. **项目服务**：每个项目绑定配置的端口，通过该端口直接访问
3. **域名配置**：
   - 本地开发：使用 `localhost`
   - 生产环境：配置实际域名，需要配合反向代理（Nginx/Traefik 等）

### 生产环境部署建议

#### 方案一：端口直接访问

```
管理后台: http://your-server-ip:3000
项目1:    http://your-server-ip:3001
项目2:    http://your-server-ip:3002
```

#### 方案二：域名 + 反向代理（推荐）

配置 Nginx 反向代理：

```nginx
# 管理后台
server {
    listen 80;
    server_name admin.yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
    }
}

# 项目1
server {
    listen 80;
    server_name docs1.yourdomain.com;
    location / {
        proxy_pass http://localhost:3001;
    }
}
```

在系统中配置：
- 项目1：domain = `docs1.yourdomain.com`, port = `3001`
- 项目2：domain = `docs2.yourdomain.com`, port = `3002`

## 常见问题

### Q: 部署失败怎么办？

1. 查看部署日志，定位失败的步骤
2. 检查 GitHub URL 是否正确
3. 检查端口是否被占用
4. 检查项目代码是否能正常构建
5. 查看 Docker 日志：`docker-compose logs -f`

### Q: 如何更新已部署的项目？

1. 点击"部署"按钮重新部署
2. 系统会自动 pull 最新代码
3. 重新构建并启动服务

### Q: 端口被占用怎么办？

1. 停止占用该端口的服务
2. 或在项目配置中更换其他端口
3. 系统会自动检测端口占用情况

### Q: 如何备份项目配置？

备份 `server/data/` 目录下的 JSON 文件：

```bash
cp server/data/projects.json backup/
cp server/data/deploy-logs.json backup/
```

### Q: 如何迁移项目到另一台服务器？

1. 备份 `server/data/` 目录
2. 备份 `projects/` 目录（可选，可以重新 clone）
3. 在新服务器上恢复这些目录
4. 重新启动服务

### Q: 支持哪些类型的项目？

理论上支持任何可以通过命令行构建和启动的项目：
- Nuxt 项目
- VitePress 项目
- VuePress 项目
- Next.js 项目
- 静态站点（HTML/CSS/JS）
- 其他 Node.js 项目

### Q: 如何查看服务运行状态？

1. 项目卡片会显示当前状态（运行中/已停止/构建中/错误）
2. 详情页显示进程 ID（PID）
3. 可以通过系统命令查看：`ps aux | grep node`

### Q: 部署步骤可以禁用吗？

可以，每个步骤都有开关，禁用后该步骤会被跳过。

### Q: 支持并发部署吗？

支持同时部署多个不同的项目，但不建议同时部署同一个项目多次。

## 目录结构

```
nuxt-stack-show/
├── app/                          # 前端应用
│   ├── components/               # 组件
│   ├── composables/              # 组合式函数
│   └── pages/                    # 页面
├── server/                       # 后端服务
│   ├── api/                      # API 路由
│   ├── data/                     # JSON 数据存储
│   └── utils/                    # 工具函数
├── projects/                     # 克隆的项目代码
├── shared/                       # 共享类型
│   └── types/
├── docker-compose.yml
├── Dockerfile
└── README.md
```

## 开发计划

- [ ] 日志自动清理机制
- [ ] 项目磁盘空间监控
- [ ] WebSocket 实时日志推送
- [ ] 部署 webhook 支持
- [ ] 多用户权限管理
- [ ] 项目分组/标签功能

## License

MIT
