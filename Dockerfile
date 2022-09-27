FROM node:16-alpine
WORKDIR /tmp
COPY src/ ./src/
COPY .env.* package*.json index.js ./
RUN npm install
