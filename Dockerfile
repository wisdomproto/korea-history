FROM node:20-slim

WORKDIR /app

# Copy shared data directory
COPY data/ data/

# Install author-tool dependencies
COPY author-tool/package.json author-tool/package-lock.json* author-tool/
RUN cd author-tool && npm install

# Copy author-tool source
COPY author-tool/ author-tool/

# Build frontend (vite) + server (tsc)
RUN cd author-tool && npm run build

# Production
ENV NODE_ENV=production
EXPOSE 3001

WORKDIR /app/author-tool
CMD ["node", "dist-server/index.js"]
