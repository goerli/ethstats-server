FROM node:10

ADD . /celostats-server
WORKDIR /celostats-server

ENV NODE_ENV=production

RUN npm install
RUN npm install -g grunt-cli
RUN grunt --configPath="src/client/js/celoConfig.js"

EXPOSE 3000
CMD ["npm", "start"]

