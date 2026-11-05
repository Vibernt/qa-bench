# syntax=docker/dockerfile:1
# the-internet (saucelabs/the-internet, Apache-2.0). Run only: the pinned commit is fetched at build time and never
# committed or redistributed. bench/ holds only our own code (a Rack wrapper for deliberate changes).
# Behind a TLS-intercepting proxy, pass its CA as an optional build secret:
#   docker build --secret id=extra_ca,src=<ca.pem> ...   (nothing is baked into the image)
# The build stage uses the full Ruby image (git and a C compiler for puma's native extension, no apt needed); the
# runtime stage is the slim image of the same Ruby and Debian release, as upstream's own Dockerfile uses.
ARG BUILD_IMAGE=ruby:4.0.7
ARG RUBY_IMAGE=ruby:4.0.7-slim

FROM ${BUILD_IMAGE} AS build
ARG UPSTREAM_REPO=https://github.com/saucelabs/the-internet
ARG UPSTREAM_SHA=412661999056d1cc302a920f8ec1b177eaa8ae3d
WORKDIR /app
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -f /run/secrets/extra_ca ]; then export GIT_SSL_CAINFO=/run/secrets/extra_ca; fi; \
    git init -q . && git remote add origin "$UPSTREAM_REPO" \
 && git fetch -q --depth 1 origin "$UPSTREAM_SHA" && git checkout -q FETCH_HEAD \
 && test "$(git rev-parse HEAD)" = "$UPSTREAM_SHA" \
 && rm -rf .git spec .github
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -f /run/secrets/extra_ca ]; then export SSL_CERT_FILE=/run/secrets/extra_ca; fi; \
    bundle config set --local without 'test e2e' && bundle install --jobs 4

FROM ${RUBY_IMAGE}
WORKDIR /app
COPY --from=build /usr/local/bundle /usr/local/bundle
COPY --from=build /app /app
COPY bench/ /app/bench/
ENV RACK_ENV=production PORT=5000
EXPOSE 5000
CMD ["bundle", "exec", "puma", "-C", "config/puma.rb", "bench/config.ru"]
