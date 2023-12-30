FROM node:18.17.0-bullseye

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./
COPY yarn.lock ./

USER node

RUN yarn install

COPY --chown=node:node . .

RUN npm run build

CMD [ "node", "./dist/index.js" ]