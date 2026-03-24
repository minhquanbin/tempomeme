import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { defineConfig } from "hardhat/config";
import dotenv from "dotenv";
dotenv.config();
export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    tempoModerato: {
      type: "http",
      chainType: "l1",
      url: process.env.TEMPO_RPC_URL ?? "https://rpc.moderato.tempo.xyz",
      accounts: process.env.TEMPO_PRIVATE_KEY
        ? [process.env.TEMPO_PRIVATE_KEY]
        : [],
      gas: 10000000,
      gasPrice: 1000000000,
    },
  },
});
