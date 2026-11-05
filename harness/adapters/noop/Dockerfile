# The noop adapter: no dependencies and no downloads. The runner mounts only /bench/brief (read-only) and /bench/out.
FROM node:22-alpine
WORKDIR /adapter
COPY noop.mjs ./
USER node
CMD ["node", "noop.mjs"]
