# ─── Fase de build ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias (separado para aprovechar caché de Docker)
COPY package*.json ./
RUN npm install

# Copiar fuentes y construir la app
COPY . .

# VITE_API_URL se puede pasar como build-arg para configurar la URL del backend
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=${VITE_API_URL}

# Zona horaria para mostrar horas al usuario (ej: Europe/Madrid, America/New_York)
ARG VITE_TIMEZONE=Europe/Madrid
ENV VITE_TIMEZONE=${VITE_TIMEZONE}

RUN npm run build

# ─── Fase de producción con Nginx ─────────────────────────────────
FROM nginx:alpine

# Copiar el build al directorio de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuración de Nginx: redirigir todas las rutas al index.html (SPA)
RUN echo 'server { \
    listen 3000; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /health { \
        return 200 "ok"; \
        add_header Content-Type text/plain; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
