Ethereum Network Stats with POA support
============
[![Build Status][travis-image]][travis-url] [![dependency status][dep-image]][dep-url]

This is a visual interface for tracking proof-of-work and proof-of-authority network status. It uses WebSockets to receive stats from running nodes and output them through an angular interface. It is the front-end implementation for [netstats-client](https://github.com/goerli/netstats-client).

## Proof-of-Authority

![Screenshot](src/images/screenshot-v0.1.0.png "Screenshot")

### Prerequisite
* node
* npm

### Installation
Make sure you have node.js and npm installed.

Clone the repository and install the dependencies

```bash
git clone https://github.com/goerli/netstats-server
cd netstats-server
npm install
sudo npm install -g grunt-cli
```

### Build
In order to build the static files you have to run grunt tasks which will generate dist directories containing the js and css files, fonts and images.

```bash
grunt poa
```

### Run

```bash
WS_SECRET="asdf" npm start
```
see the interface at http://localhost:3000

## Proof-of-Work

![Screenshot](src/images/screenshot-v0.0.6.png "Screenshot")

Same as above, just run the `pow` build task in Grunt.

```bash
grunt pow
WS_SECRET="asdf" npm start
```

see the interface at http://localhost:3000

[travis-image]: https://travis-ci.org/goerli/netstats-server.svg
[travis-url]: https://travis-ci.org/goerli/netstats-server
[dep-image]: https://david-dm.org/goerli/netstats-server.svg
[dep-url]: https://david-dm.org/goerli/netstats-server
