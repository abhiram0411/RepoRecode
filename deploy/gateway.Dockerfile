FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY server ./server
COPY src/core/import.ts src/core/types.ts ./src/core/
RUN mkdir /app/data && chown node:node /app/data
USER node
ENV HOST=0.0.0.0
EXPOSE 8788
CMD ["node","server/index.mjs"]
