# This Dockerfile is for quickly rolling an image from an already-built dev-frontend.
# If you want to build the image yourself, you must build the dev-frontend with `yarn build` first.

FROM nginx@sha256:ff466795a4535e1d47cf2b901ce15b0ad2ba7f6e0140f12f7d62cb1c9160067a
COPY etc /etc
COPY docker-entrypoint.d /docker-entrypoint.d
COPY dist /usr/share/nginx/html
