Celo Network Stats
===============================================

This is a visual interface for tracking proof-of-work ("mainnet") and proof-of-authority ("testnet") network status. It uses WebSockets to receive stats from running nodes and output them through an angular interface. It is the front-end implementation for [ethstats-client](https://github.com/goerli/ethstats-client).

## Proof-of-Authority
![Screenshot](src/images/screenshot-poa.png "Screenshot POA")

* Demo: https://kovan-stats.parity.io/
* Demo: https://stats.goerli.net/

#### Prerequisite
* node
* npm

#### Installation
Make sure you have node.js (10 or above) and npm installed.

Clone the repository and install the dependencies:

```bash
git clone https://github.com/goerli/ethstats-server
cd ethstats-server
npm install
npm install -g grunt-cli
```

#### Build
In order to build the static files you have to run grunt tasks which will generate dist directories containing the js and css files, fonts and images.

```bash
grunt
```

To build the static files for a network other than Ethereum copy and change src/js/defaultConfig.js and run the following command.

```bash
grunt --configPath="src/js/celoConfig.js"
```

#### Run
Start a node process and pass a trusted node to it or edit the list of trusted nodes in [the server config](/lib/utils/config.js).

```bash
TRUSTED_NODE=0x47e172f6cfb6c7d01c1574fa3e2be7cc73269d95 npm start
```
Find the interface at http://localhost:3000
