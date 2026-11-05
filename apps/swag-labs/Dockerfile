# syntax=docker/dockerfile:1
# Swag Labs (saucelabs/sample-app-web, MIT), vendored in upstream/ with small QA-BENCH patches.
# Stage 1 builds the React app with Vite; stage 2 serves it with nginx. bench/runtime-config.sh writes the
# per-episode config at start, so one image serves every episode and a fresh container is a fresh state.
# Behind a TLS-intercepting proxy, pass its CA as an optional build secret:
#   docker build --secret id=extra_ca,src=<ca.pem> ...   (nothing is baked into the image)
ARG NODE_IMAGE=node:24-alpine
ARG NGINX_IMAGE=nginx:1.29-alpine

FROM ${NODE_IMAGE} AS build
WORKDIR /src
COPY upstream/package.json upstream/package-lock.json ./
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -f /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi; \
    npm ci --no-audit --no-fund
COPY upstream/ ./
RUN npm run build

FROM ${NGINX_IMAGE}
COPY bench/nginx.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 bench/runtime-config.sh /docker-entrypoint.d/40-qa-bench-runtime-config.sh
COPY --from=build /src/build /usr/share/nginx/html
EXPOSE 80
