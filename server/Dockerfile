FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY . .
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 4000
CMD ["pnpm", "start"]
