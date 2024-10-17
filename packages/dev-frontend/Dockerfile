# This Dockerfile is for quickly rolling an image from an already-built dev-frontend.
# If you want to build the image yourself, you must build the dev-frontend with `yarn build` first.

FROM nginx@sha256:28402db69fec7c17e179ea87882667f1e054391138f77ffaf0c3eb388efc3ffb
COPY etc /etc
COPY docker-entrypoint.d /docker-entrypoint.d
COPY dist /usr/share/nginx/html
