FROM node:22-bookworm-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG NEXT_PUBLIC_SITE_URL=http://localhost:43123
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN npm run build

ENV NODE_ENV=production
ENV PORT=43123
ENV HOSTNAME=0.0.0.0
ENV DATA_DIR=/data

RUN mkdir -p /data
EXPOSE 43123

CMD ["npm", "start"]
