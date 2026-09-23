FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY backend ./backend

EXPOSE 3000

CMD ["npx", "tsx", "backend/src/server.ts"]