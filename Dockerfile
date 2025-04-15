FROM node:18
WORKDIR /usr/app
COPY package.json .
RUN npm install -g pnpm
RUN pnpm install
COPY . .
EXPOSE 8000
CMD ["pnpm", "start"]
