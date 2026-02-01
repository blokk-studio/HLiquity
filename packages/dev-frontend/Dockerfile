# This Dockerfile is for quickly rolling an image from an already-built dev-frontend.
# If you want to build the image yourself, you must build the dev-frontend with `yarn build` first.

FROM nginx@sha256:c881927c4077710ac4b1da63b83aa163937fb47457950c267d92f7e4dedf4aec
COPY etc /etc
COPY docker-entrypoint.d /docker-entrypoint.d
COPY dist /usr/share/nginx/html
