require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
// require("@nomiclabs/hardhat-etherscan");
// require("@nomiclabs/hardhat-waffle");
// require("hardhat-gas-reporter");
// require("solidity-coverage");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.18",
};

module.exports = {
  networks: {
    hardhat: {
      forking: {
        url: process.env.GOERII_URL_AlCHEMY,
        allowUnlimitedContractSize: true,
        timeout: 90000,
        //blockNumber:12325509
        blockNumber: 7022764,
        chainId: 5,
        gas: 9000000000000000
      }

    },

    bsctest: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      gasPrice: 20000000000,
      accounts: {
        mnemonic: process.env.MNEMONIC,
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
        passphrase: "",
      },
    },

    roburna: {
      url: process.env.ROBURNA_URL || 'https://preseed-testnet-1.roburna.com/',
      //accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [process.env.PRIVATE_KEY0,process.env.PRIVATE_KEY1,process.env.PRIVATE_KEY2,process.env.PRIVATE_KEY3,process.env.PRIVATE_KEY4,process.env.PRIVATE_KEY5],
      accounts: {
        mnemonic: process.env.MNEMONIC,
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
        passphrase: "",
      },
      gas: 5603244,
      chainId: 159
    },
    goerli: {
      url: process.env.GOERII_URL_AlCHEMY,
      accounts: {
        mnemonic: process.env.MNEMONIC,
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 10,
        passphrase: "",
      }
    }
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },

  solidity: {
    compilers: [

      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000
          }
        }
      },
      {
        version: "0.8.5",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.8.7",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.8.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.8.18",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ],

  },

  mocha: {
    // reporter: 'xunit',
    // reporterOptions: {
    //   //output: 'GIVERS_TEST-results.xml'
    // },
    // Exclude specific file(s) from tests
    exclude: [
    './home/steve/Documents/Dapps/entitosidai-contract/test/Lock.js'
    ]
  }
};