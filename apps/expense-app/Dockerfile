# syntax=docker/dockerfile:1
# Expense app (ours, apps/expense-app/app). Node 26 for node:sqlite.
# Behind a TLS-intercepting proxy, pass its CA as an optional build secret:
#   docker build --secret id=extra_ca,src=<ca.pem> ...   (nothing is baked into the image)
ARG NODE_IMAGE=node:26-alpine
FROM ${NODE_IMAGE} AS build
WORKDIR /src
COPY app/package.json app/package-lock.json ./
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -f /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi; \
    npm ci --no-audit --no-fund
COPY app/tsconfig.json ./
COPY app/src ./src
RUN npx tsc -p .

FROM ${NODE_IMAGE}
WORKDIR /app
COPY app/package.json ./
COPY --from=build /src/dist ./dist
COPY bench-entry.mjs ./
ENV NODE_ENV=production PORT=3000 DB_PATH=/tmp/expense.db
EXPOSE 3000
USER node
CMD ["node", "bench-entry.mjs"]
