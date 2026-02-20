# Build stage
FROM node:18-alpine as build-stage

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build:h5

# Production stage
FROM nginx:alpine as production-stage

RUN mkdir -p /var/cache/nginx /tmp/nginx /var/log/nginx \
    && chown -R nginx:nginx /var/cache/nginx /tmp/nginx /var/log/nginx /usr/share/nginx/html \
    && sed -i '/^[[:space:]]*user[[:space:]]\+/d;/^[[:space:]]*pid[[:space:]]\+/d' /etc/nginx/nginx.conf

COPY --from=build-stage --chown=nginx:nginx /app/dist/build/h5 /usr/share/nginx/html
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

USER nginx

EXPOSE 3000

CMD ["nginx", "-g", "daemon off; pid /tmp/nginx/nginx.pid;"]
