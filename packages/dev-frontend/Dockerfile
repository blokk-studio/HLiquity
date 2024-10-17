# This Dockerfile is for quickly rolling an image from an already-built dev-frontend.
# If you want to build the image yourself, you must build the dev-frontend with `yarn build` first.

FROM nginx@sha256:a6b75a320a9a95bcaed28484349557d1ec7426041be35a62386dfa6609225ad3
COPY etc /etc
COPY docker-entrypoint.d /docker-entrypoint.d
COPY dist /usr/share/nginx/html
