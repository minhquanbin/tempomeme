import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as dotenv from "dotenv";
dotenv.config();

const SCAN_INTERVAL_MS = 30 * 60 * 1000;

const chain = {
  id: 42431,
  name: "tempoModerato",
  nativeCurrency: { name: "USD", symbol: "USD", decimals: 18 },
  rpcUrls: { default: { http: [process.env.TEMPO_RPC_URL ?? "https://rpc.moderato.tempo.xyz"] } },
};

const account  = privateKeyToAccount(process.env.TEMPO_PRIVATE_KEY);
const pub      = createPublicClient({ chain, transport: http(process.env.TEMPO_RPC_URL ?? "https://rpc.moderato.tempo.xyz") });
const wallet   = createWalletClient({ chain, transport: http(process.env.TEMPO_RPC_URL ?? "https://rpc.moderato.tempo.xyz"), account });

const FACTORY  = process.env.MEME_FACTORY_ADDRESS;
const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

const FACTORY_ABI = [
  { inputs: [], name: "getAllTokens", outputs: [{ type: "address[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "token", type: "address" }], name: "tokenToPool", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
];

const POOL_ABI = [
  { inputs: [], name: "graduated",          outputs: [{ type: "bool" }],    stateMutability: "view", type: "function" },
  { inputs: [], name: "usdReserve",         outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "isRedeemPeriodEnded", outputs: [{ type: "bool" }],   stateMutability: "view", type: "function" },
  { inputs: [], name: "recoverToTreasury",  outputs: [],                    stateMutability: "nonpayable", type: "function" },
];

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function scan() {
  log("Scanning pools...");
  try {
    const tokens = await pub.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "getAllTokens" });
    log(`Found ${tokens.length} tokens`);

    for (const token of tokens) {
      try {
        const poolAddr = await pub.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "tokenToPool", args: [token] });
        if (!poolAddr || poolAddr === ZERO_ADDR) continue;

        const [graduated, usdReserve, isEnded] = await Promise.all([
          pub.readContract({ address: poolAddr, abi: POOL_ABI, functionName: "graduated" }),
          pub.readContract({ address: poolAddr, abi: POOL_ABI, functionName: "usdReserve" }),
          pub.readContract({ address: poolAddr, abi: POOL_ABI, functionName: "isRedeemPeriodEnded" }),
        ]);

        if (!graduated) continue;
        if (!isEnded)   continue;
        if (usdReserve === 0n) continue;

        log(`Pool ${poolAddr} ready: $${(Number(usdReserve) / 1e6).toFixed(2)} to recover`);

        const hash = await wallet.writeContract({
          address: poolAddr,
          abi: POOL_ABI,
          functionName: "recoverToTreasury",
        });

        log(`recoverToTreasury sent: ${hash}`);
        await pub.waitForTransactionReceipt({ hash });
        log(`Recovered $${(Number(usdReserve) / 1e6).toFixed(2)} from pool ${poolAddr}`);

      } catch (err) {
        log(`Error processing token ${token}: ${err.message}`);
      }
    }
  } catch (err) {
    log(`Scan error: ${err.message}`);
  }

  log(`Next scan in 30 minutes\n`);
}

log("Treasury recovery bot started");
log(`Factory : ${FACTORY}`);
log(`Wallet  : ${account.address}`);
log(`Interval: 30 minutes\n`);

scan();
setInterval(scan, SCAN_INTERVAL_MS);
