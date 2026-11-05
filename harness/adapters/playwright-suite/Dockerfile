# syntax=docker/dockerfile:1
# Self-contained: the runner mounts only /bench/brief (read-only) and /bench/out.
# The base image already holds Chromium for Playwright 1.63.0; Node 24 in it runs the TypeScript directly.
# Behind a TLS-intercepting proxy, pass its CA as an optional build secret:
#   docker build --secret id=extra_ca,src=<ca.pem> ...   (nothing is baked into the image)
FROM mcr.microsoft.com/playwright:v1.63.0-noble
WORKDIR /adapter
ENV NODE_ENV=production PLAYWRIGHT_BROWSERS_PATH=/ms-playwright PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -f /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi; \
    npm ci --omit=dev --no-audit --no-fund
COPY src/ ./src/
CMD ["node", "src/main.ts"]
