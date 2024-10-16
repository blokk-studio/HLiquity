# This Dockerfile is for quickly rolling an image from an already-built dev-frontend.
# If you want to build the image yourself, you must build the dev-frontend with `yarn build` first.

FROM nginx@sha256:d2eb56950b84efe34f966a2b92efb1a1a2ea53e7e93b94cdf45a27cf3cd47fc0
COPY etc /etc
COPY docker-entrypoint.d /docker-entrypoint.d
COPY dist /usr/share/nginx/html
