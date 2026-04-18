FROM node:20-alpine
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tencent.com/g' /etc/apk/repositories \
    && apk add --no-cache \
       chromium \
       font-noto-cjk \
       && rm -rf /var/cache/apk/*
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY src/ ./src/
ENV PORT=3000
ENV NODE_ENV=production
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
EXPOSE $PORT
CMD ["node", "src/index.js"]