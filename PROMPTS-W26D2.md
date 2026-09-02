## Multi stage dockerfile

- Create the Dockerfile
- Debug the Docker build issue using Copilot
- docker build --no-cache --platform linux/arm64 -t fintrack-api:local .
- Make sure to use session pooler for ipv4 only
- Docker run docker run --env-file .env -p 3001:3000 fintrack-api

## Docker Compose
- Create the docker compose 

## Create Render
- Use Docker
- Add env
- Prompting to add health check


## Dockerfile Explanation
This is a multi-stage Docker build that separates compilation from runtime. Here's each line:

Build Stage
### FROM node:20-alpine AS build

Starts the build stage using Node.js 20 on Alpine Linux (lightweight distribution)
Named "build" so it can be referenced later

### WORKDIR /app
Sets the working directory inside the container to /app

### RUN apk add --no-cache openssl
Installs OpenSSL using Alpine's package manager (apk)
--no-cache skips package manager cache to reduce image size

### COPY package*.json ./
Copies package.json and package-lock.json (the * is a wildcard) from your host machine to /app
These are copied separately to leverage Docker layer caching

### RUN npm ci
Installs dependencies using npm ci (clean install), which installs exact versions from the lock file—more reliable than npm install in Docker

### COPY . .
Copies the entire project source code into the container

### RUN npx prisma generate
Generates the Prisma client from schema.prisma

### RUN npm run build
Compiles TypeScript to JavaScript, creating the dist folder
Runtime Stage

### FROM node:20-alpine AS run
Starts a fresh second stage (final image) using the same lightweight base image
Named "run" to distinguish it from the build stage

### WORKDIR /app
Sets working directory to /app

### RUN apk add --no-cache openssl
Installs OpenSSL again in the runtime image

### ENV NODE_ENV=production
Sets the NODE_ENV environment variable to production

### COPY --from=build /app/dist ./dist
Copies only the compiled application from the build stage

### COPY --from=build /app/node_modules ./node_modules
Copies only production dependencies from the build stage

### COPY --from=build /app/prisma ./prisma
Copies the Prisma directory (needed at runtime for migrations)

### EXPOSE 3000
Documents that the app listens on port 3000 (metadata only; doesn't actually open the port)

### CMD ["node", "dist/src/main.js"]
Default command when the container starts—runs the compiled NestJS application