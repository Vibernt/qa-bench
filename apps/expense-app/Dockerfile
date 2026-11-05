FROM node:22-alpine
WORKDIR /app
COPY .fetched/ /app/
# The fixture has no runtime dependencies (docs/APPS.md); install only if a lockfile is present.
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; fi
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
