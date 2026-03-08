FROM oven/bun:1

WORKDIR /api

COPY package.json ./
COPY bun.lockb* ./

RUN bun install

COPY . .

EXPOSE  3000

CMD ["bun", "run", "dev"]
