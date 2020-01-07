Celo Network Stats
===============================================

This is a visual interface for tracking proof-of-work ("mainnet") and proof-of-authority ("testnet") network status. It uses WebSockets to receive stats from running nodes and output them through an angular interface. It is the front-end implementation for [ethstats-client](https://github.com/goerli/ethstats-client).

## Proof-of-Stake
![Screenshot](https://user-images.githubusercontent.com/6178597/69904869-cba34900-13ac-11ea-9136-13fc51cf246e.gif "Screenshot POS")

* Demo: https://baklavastaging-ethstats.celo-testnet.org/

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
Start a node process and pass a comma-separated list of trusted addresses to it or edit the list of trusted addresses in [the server config](/lib/utils/config.js).

```bash
TRUSTED_ADDRESSES="0x47e172F6CfB6c7D01C1574fa3E2Be7CC73269D95,0xa0Af2E71cECc248f4a7fD606F203467B500Dd53B" npm start
```
Find the interface at http://localhost:3000
