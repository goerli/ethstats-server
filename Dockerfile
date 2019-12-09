FROM node

ADD . /celostats-server
WORKDIR /celostats-server
RUN npm install
RUN npm install -g grunt-cli
RUN sed -i "s#networkName =.*#networkName = '${NETWORK_NAME:-Celo}'#g" src/js/celoConfig.js
RUN sed -i "s#blockscoutUrl =.*#blockscoutUrl = '${BLOCKSOUT_URL:-https://baklava-blockscout.celo-testnet.org/}'#g" src/js/celoConfig.js
RUN grunt --configPath="src/js/celoConfig.js"

EXPOSE  3000
CMD ["npm", "start"]

