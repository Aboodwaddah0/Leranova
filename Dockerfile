FROM node:20-bookworm-slim

WORKDIR /app

# Prisma engines require OpenSSL at runtime inside the container.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
COPY server.js ./server.js

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
