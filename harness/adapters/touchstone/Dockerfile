# Self-contained: the runner mounts only /bench/brief (read-only) and /bench/out.
FROM node:22-alpine
WORKDIR /adapter
COPY package.json ./
COPY src/ ./src/
USER node
CMD ["node", "src/main.ts"]
