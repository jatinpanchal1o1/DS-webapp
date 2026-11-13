# Build from repository root: docker build -f frontend/Dockerfile .
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm install --workspace=frontend
COPY frontend ./frontend
WORKDIR /app/frontend
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build
FROM nginx:alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
