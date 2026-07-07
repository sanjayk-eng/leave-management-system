# Multi-stage build for Zenithive Frontend
# Stage 1: Build the application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Accept build arguments for API URL and Google OAuth
ARG VITE_API_BASE_URL=http://localhost:8082/api
ARG VITE_GOOGLE_CLIENT_ID=""

# Set environment variables for build (Vite bakes these in at build time)
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production image with Nginx
FROM nginx:alpine AS production

# Copy nginx config as a template - entrypoint will run envsubst to inject $PORT
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy public assets
COPY --from=builder /app/public /usr/share/nginx/html

# Railway injects PORT at runtime; default to 8080 for local runs
ENV PORT=8080

# Expose default port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:${PORT}/ || exit 1

# nginx:alpine's entrypoint auto-runs envsubst on /etc/nginx/templates/*.template
CMD ["nginx", "-g", "daemon off;"]
