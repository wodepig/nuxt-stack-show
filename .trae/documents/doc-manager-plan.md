# 文档管理项目规划

## 项目概述
构建一个基于 Nuxt 全栈的文档管理系统，用于管理多个 GitHub 开源项目的帮助文档。支持配置管理、文档更新、构建部署和域名绑定。

## 技术栈
- **前端**: Nuxt 4 + Nuxt UI 4 + Vue 3 + TailwindCSS
- **后端**: Nuxt Server API (使用 $fetch 进行请求)
- **存储**: JSON 文件存储 (server/data/)
- **进程管理**: 子进程执行构建和启动命令
- **部署**: Docker

---

## 数据结构

### Project 项目配置
```typescript
interface Project {
  id: string;                    // 唯一标识
  name: string;                  // 项目名称
  description?: string;          // 项目描述
  gitUrl: string;                // GitHub URL
  branch: string;                // 分支 (默认 main)
  domain: string;                // 绑定的域名
  port: number;                  // 服务端口 (手动配置)
  steps: DeployStep[];           // 部署步骤配置（每个项目可自定义）
  status: 'idle' | 'cloning' | 'installing' | 'building' | 'running' | 'error';
  pid?: number;                  // 运行中的进程ID
  lastUpdatedAt?: string;        // 最后更新时间
  createdAt: string;             // 创建时间
}

// 部署步骤类型
interface DeployStep {
  id: string;                    // 步骤ID
  name: string;                  // 步骤名称
  type: 'git_clone' | 'git_pull' | 'shell' | 'kill_process' | 'start_service';
  command?: string;              // 执行的命令（shell类型时使用）
  workingDir?: string;           // 工作目录
  enabled: boolean;              // 是否启用
  order: number;                 // 执行顺序
}
```

### 预设步骤模板
```typescript
// 预设模板供前端选择
const STEP_TEMPLATES = {
  // Nuxt 项目模板
  nuxt: [
    { name: '下载/更新代码', type: 'git_clone', enabled: true },
    { name: '安装依赖', type: 'shell', command: 'pnpm install', enabled: true },
    { name: '构建项目', type: 'shell', command: 'pnpm build', enabled: true },
    { name: '关闭旧进程', type: 'kill_process', enabled: true },
    { name: '启动服务', type: 'start_service', command: 'node .output/server/index.mjs', enabled: true },
  ],
  // VitePress 项目模板
  vitepress: [
    { name: '下载/更新代码', type: 'git_clone', enabled: true },
    { name: '安装依赖', type: 'shell', command: 'pnpm install', enabled: true },
    { name: '构建项目', type: 'shell', command: 'pnpm docs:build', enabled: true },
    { name: '关闭旧进程', type: 'kill_process', enabled: true },
    { name: '启动服务', type: 'start_service', command: 'pnpm docs:preview --port', enabled: true },
  ],
  // 静态站点模板（无需启动服务）
  static: [
    { name: '下载/更新代码', type: 'git_clone', enabled: true },
    { name: '安装依赖', type: 'shell', command: 'pnpm install', enabled: true },
    { name: '构建项目', type: 'shell', command: 'pnpm build', enabled: true },
  ]
};
```

### DeployLog 部署日志
```typescript
interface DeployLog {
  id: string;
  projectId: string;             // 关联项目ID
  stepId?: string;               // 关联步骤ID
  type: 'clone' | 'pull' | 'install' | 'build' | 'start' | 'stop' | 'error';
  message: string;               // 日志内容
  details?: string;              // 详细输出
  status: 'running' | 'success' | 'failed';
  duration?: number;             // 耗时(ms)
  createdAt: string;
}
```

---

## 目录结构

```
nuxt-stack-show/
├── app/                          # 前端应用
│   ├── components/               # 组件
│   │   ├── project/              # 项目相关组件
│   │   │   ├── ProjectCard.vue
│   │   │   ├── ProjectForm.vue
│   │   │   └── ProjectStatus.vue
│   │   └── deploy/               # 部署相关组件
│   │       ├── DeployLog.vue
│   │       ├── DeployProgress.vue
│   │       └── StepEditor.vue    # 步骤编辑器
│   ├── composables/              # 组合式函数
│   │   ├── useProjects.ts        # 使用 $fetch 请求 API
│   │   └── useDeploy.ts
│   ├── pages/                    # 页面
│   │   ├── index.vue             # 项目列表
│   │   └── projects/
│   │       ├── [id].vue          # 项目详情
│   │       └── new.vue           # 新建项目
│   └── app.vue
├── server/                       # 后端服务
│   ├── api/                      # API 路由
│   │   ├── projects/             # 项目管理 API
│   │   │   ├── index.get.ts      # 获取项目列表
│   │   │   ├── index.post.ts     # 创建项目
│   │   │   ├── templates.get.ts  # 获取步骤模板
│   │   │   └── [id]/
│   │   │       ├── index.get.ts  # 获取项目详情
│   │   │       ├── index.put.ts  # 更新项目
│   │   │       ├── index.delete.ts # 删除项目
│   │   │       ├── deploy.post.ts  # 触发部署（统一入口）
│   │   │       ├── stop.post.ts    # 停止服务
│   │   │       └── logs.get.ts     # 获取部署日志
│   │   └── health.get.ts
│   ├── data/                     # JSON 数据存储
│   │   ├── projects.json
│   │   └── deploy-logs.json
│   ├── utils/                    # 工具函数
│   │   ├── storage.ts            # JSON 文件操作
│   │   ├── git.ts                # Git 操作
│   │   ├── process.ts            # 进程管理 (kill命令)
│   │   ├── port.ts               # 端口扫描管理
│   │   ├── deploy.ts             # 部署逻辑
│   │   └── steps.ts              # 步骤执行器
│   └── types/                    # 类型定义
│       └── index.ts
├── projects/                     # 下载的开源项目存储目录 (gitignore)
├── shared/                       # 共享类型
│   └── types/
│       └── project.ts
├── docker-compose.yml
├── Dockerfile
└── nuxt.config.ts
```

---

## API 设计

### 项目管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/projects | 获取项目列表 |
| POST | /api/projects | 创建项目 |
| GET | /api/projects/templates | 获取步骤预设模板 |
| GET | /api/projects/:id | 获取项目详情 |
| PUT | /api/projects/:id | 更新项目配置 |
| DELETE | /api/projects/:id | 删除项目 |

### 部署管理（统一入口）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/projects/:id/deploy | **统一部署入口**，后端根据项目 steps 配置执行 |
| POST | /api/projects/:id/stop | 停止服务 |
| GET | /api/projects/:id/logs | 获取部署日志 |
| GET | /api/projects/:id/status | 获取实时状态 |

---

## 部署流程

```
1. 前端触发部署 (POST /api/projects/:id/deploy)
   - 只需传入项目 id 或 name
   ↓
2. 后端根据项目配置的 steps 按顺序执行
   - 遍历项目的 steps 数组（按 order 排序）
   - 根据 step.type 执行不同操作：
     
     git_clone:   首次 git clone，后续 git pull
     shell:       执行自定义命令（pnpm install / pnpm build 等）
     kill_process: 关闭项目的旧进程（通过 pid）
     start_service: 启动服务，保存新 pid
   
   ↓
3. 每个步骤执行时：
   - 记录开始日志
   - 执行操作
   - 记录结果（成功/失败）
   - 失败则停止后续步骤
   ↓
4. 完成，返回部署结果和访问 URL
```

### 后端步骤执行器
```typescript
// server/utils/steps.ts
async function executeDeploy(projectId: string) {
  const project = await getProject(projectId);
  
  // 按 order 排序步骤
  const steps = project.steps
    .filter(s => s.enabled)
    .sort((a, b) => a.order - b.order);
  
  for (const step of steps) {
    const log = await createDeployLog(project.id, step.id);
    
    try {
      switch (step.type) {
        case 'git_clone':
          await executeGitStep(project);
          break;
        case 'shell':
          await executeShellStep(step.command, step.workingDir || projectDir);
          break;
        case 'kill_process':
          await killProjectProcess(project);
          break;
        case 'start_service':
          const pid = await startProjectService(project, step.command);
          await updateProjectPid(project.id, pid);
          break;
      }
      await updateDeployLog(log.id, { status: 'success' });
    } catch (error) {
      await updateDeployLog(log.id, { status: 'failed', details: error.message });
      throw error; // 停止后续步骤
    }
  }
}
```

---

## 前端页面

### 1. 项目列表页 (/)
- 展示所有项目卡片
- 显示项目状态 (运行中/已停止/部署中/错误)
- 快捷操作: 部署、停止、访问、编辑、删除
- 新建项目按钮

### 2. 新建/编辑项目页 (/projects/new, /projects/:id/edit)
- 基础配置:
  - 项目名称
  - 项目描述
  - GitHub URL
  - 分支选择
  - 绑定域名
  - 服务端口 (手动输入，检查是否被占用)
- 部署步骤配置:
  - 选择预设模板 (Nuxt / VitePress / Static / 自定义)
  - 步骤列表（可拖拽排序）:
    - 步骤名称
    - 步骤类型 (git_clone / shell / kill_process / start_service)
    - 执行命令 (shell/start_service 类型时显示)
    - 工作目录
    - 是否启用
  - 添加/删除/编辑步骤

### 3. 项目详情页 (/projects/:id)
- 项目基本信息
- 当前状态
- 部署步骤预览
- 部署历史日志
- 实时日志输出 (WebSocket 或轮询)
- 操作按钮: 部署、停止、访问

---

## 实现步骤

### 阶段 1: 基础架构
1. 创建目录结构
2. 配置共享类型 (shared/types/)
3. 实现 JSON 存储工具 (server/utils/storage.ts)
4. 创建数据模型文件
5. 实现端口扫描工具 (server/utils/port.ts)

### 阶段 2: 后端 API
1. 实现项目管理 CRUD API
2. 实现步骤模板 API (/api/projects/templates)
3. 实现 Git 操作工具
4. 实现进程管理工具 (支持 kill 命令)
5. **实现步骤执行器 (server/utils/steps.ts)**
6. 实现统一部署入口 (/api/projects/:id/deploy)
7. 实现部署日志 API
8. 后端启动时扫描端口状态

### 阶段 3: 前端界面
1. 项目列表页面
2. 项目表单组件 (新建/编辑)
3. **步骤编辑器组件 (StepEditor.vue)**
4. 项目详情页面
5. 部署日志组件
6. 状态显示组件

### 阶段 4: Docker 配置
1. 编写 Dockerfile
2. 编写 docker-compose.yml
3. 配置环境变量
4. 测试部署流程

---

## 关键实现细节

### 步骤执行器设计
- 每个项目独立配置 steps
- 支持 4 种步骤类型：git_clone、shell、kill_process、start_service
- 步骤可排序、启用/禁用
- 执行失败自动停止，记录错误日志

### 统一部署入口
- 前端只需调用 `POST /api/projects/:id/deploy`
- 后端根据项目配置的 steps 自动执行
- 无需前端关心具体执行逻辑

### 进程管理
- 使用 Node.js child_process 模块
- 维护进程 PID 映射 (projectId -> pid)
- **服务重启时先关闭之前的进程** (使用系统命令 kill)
- 日志实时写入并推送到前端

### 端口管理
- 端口在创建项目时**手动配置**
- 后端启动时自动扫描已配置端口的使用情况
- 检测端口是否被占用，更新项目状态

### 存储设计
- projects.json: 项目配置数组（包含 steps）
- deploy-logs.json: 部署日志数组 (限制数量，防止过大)
- 文件操作使用异步读写，考虑并发安全

### 错误处理
- 每个步骤的错误捕获和记录
- 部署失败自动停止后续步骤
- 前端友好的错误提示

### 安全考虑
- 命令执行前校验 (防止命令注入)
- 端口占用检查
- 域名格式验证

---

## Docker 部署说明

### 构建镜像
```bash
docker build -t doc-manager .
```

### 运行容器
```bash
docker-compose up -d
```

### 端口映射
- 管理后台: 3000
- 各文档项目: 根据配置动态分配 (建议 3001-3100)

### 数据持久化
- server/data/: 配置文件
- projects/: 下载的项目代码
