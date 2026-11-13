# Build from repository root: docker build -f backend/Dockerfile .
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm install --omit=dev --workspace=backend
COPY backend ./backend
ENV NODE_ENV=production
WORKDIR /app/backend
EXPOSE 5000
CMD ["npm", "start"]
