# Stage 1: Build React + Vite Web Game
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Stage 2: Serve Web Game with Nginx
FROM nginx:alpine AS runner

# SPA Nginx config (supports client-side routing & asset caching)
RUN printf 'server {\n\
    listen 80;\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    location /assets/ {\n\
        expires 30d;\n\
        add_header Cache-Control "public, no-transform";\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
