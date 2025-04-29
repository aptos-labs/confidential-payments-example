FROM node:20.15.0 AS builder

WORKDIR /app

COPY . ./

ARG BUILD_VERSION

RUN corepack enable
RUN yarn install
RUN yarn lint | tee 1.log | sed -e 's/^/[yarn lint] /' & yarn test | tee 2.log | sed -e 's/^/[yarn test] /' & VITE_APP_BUILD_VERSION="$BUILD_VERSION" yarn build | tee 3.log | sed -e 's/^/[yarn build] /'

FROM nginx:1.20.2-alpine

COPY nginx.conf /etc/nginx/nginx.conf

COPY --from=builder /app/dist /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]
