FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++ openssl

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS run
WORKDIR /app
RUN apk add --no-cache python3 make g++ openssl

ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package*.json ./

# Fresh install for Alpine Linux - this compiles bcrypt for the correct platform
RUN npm ci --production

EXPOSE 3000
CMD ["node", "dist/src/main.js"]