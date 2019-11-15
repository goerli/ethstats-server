FROM node

ADD . /celostats-server
WORKDIR /celostats-server
RUN npm install
RUN npm install -g grunt-cli
RUN grunt

EXPOSE  3000
CMD ["npm", "start"]

