FROM node:20

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD curl -f http://localhost:3000 || exit 1

CMD ["npm", "run", "start"]
