import { HardhatUserConfig } from 'hardhat/types'

import 'dotenv/config'
import 'hardhat-deploy'
import 'hardhat-typechain'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'

const dotenv = require('dotenv')

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.5.16',
        settings: {
          evmVersion: 'constantinople',
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  namedAccounts: {
    deployer: 0,
    dev: 1,
    other:2
  },
  networks: {
    cypress: {
      url: 'http://localhost:3000',
      chainId: 8217,
      gas: 20000000,
      gasPrice: 25000000000,
      accounts: {
        mnemonic: process.env.MNEMONIC,
      },
      live: true,
      saveDeployments: true,
      tags: ['mainnet'],
    },
    baobab: {
      url: 'http://localhost:3000',
      chainId: 1001,
      gas: 20000000,
      gasPrice: 25000000000,
      accounts: {
        mnemonic: process.env.MNEMONIC,
      },
      live: true,
      saveDeployments: true,
      tags: ['testnet'],
    },
    localhost: {
      live: false,
      saveDeployments: true,
      tags: ['local'],
    },
    hardhat: {
      live: false,
      saveDeployments: true,
      chainId: 8545,
      tags: ['test', 'local'],
      accounts: {
        mnemonic: process.env.MNEMONIC,
        accountsBalance: '10000000000000000000000000000000000000000000000000000000000000000',
      },
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY}`,
      chainId: 3,
      live: true,
      saveDeployments: true,
      accounts: {
        mnemonic: process.env.MNEMONIC,
      },
      tags: ['staging'],
      gasPrice: 5000000000,
      gasMultiplier: 2,
    },
  },
}
export default config
