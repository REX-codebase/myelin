FROM node:22-slim
WORKDIR /app
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=binary
ENV PRISMA_CLIENT_ENGINE_TYPE=binary
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build
CMD ["node", "dist/server.js"]
