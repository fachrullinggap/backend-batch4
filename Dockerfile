# --- Stage 1: Build dependencies ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY generated/prisma ./prisma
RUN npm ci --only=production

# --- Stage 2: Copy source and run ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
EXPOSE 4000
CMD ["node", "api/index.js"]