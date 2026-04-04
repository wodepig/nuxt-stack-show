# 构建阶段
FROM node:20-alpine AS builder

# 设置 npm 淘宝镜像源
RUN npm config set registry https://registry.npmmirror.com

# 安装 pnpm
RUN npm install -g pnpm

# 设置 pnpm 淘宝镜像源
RUN pnpm config set registry https://registry.npmmirror.com

WORKDIR /app

# 复制 package.json 和 lock 文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建 Nuxt 应用
RUN pnpm build

# 生产阶段
FROM node:20-alpine

# 安装必要的工具（Git、Bash、curl 等）
RUN apk add --no-cache git bash curl

# 设置 npm 淘宝镜像源
RUN npm config set registry https://registry.npmmirror.com

# 安装 pnpm
RUN npm install -g pnpm

# 设置 pnpm 淘宝镜像源
RUN pnpm config set registry https://registry.npmmirror.com

WORKDIR /app

# 复制构建产物
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./

# 只安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 创建数据目录和项目目录
RUN mkdir -p server/data projects

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", ".output/server/index.mjs"]
