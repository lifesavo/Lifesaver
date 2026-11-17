FROM node:22-bookworm-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=43123
ENV HOSTNAME=0.0.0.0
ENV DATA_DIR=/data

RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 43123

CMD ["npm", "start"]
