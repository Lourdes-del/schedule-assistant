# 依赖安装层（复用 package-lock.json，保证可复现）
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 运行层
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

EXPOSE 3000
# 数据目录挂载点（SQLite 与上传头像）
VOLUME ["/app/data"]

CMD ["npm", "start"]
