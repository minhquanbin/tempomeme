import { createPublicClient, http } from "viem";
import { defineChain } from "viem";

const tempoModerato = defineChain({
  id: 42431,
  name: "Tempo Moderato Testnet",
  nativeCurrency: { name: "USD", symbol: "USD", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.moderato.tempo.xyz"] } },
});

const SALE = "0x4282C866A04f0cdfD69443496A9C0b0B0DD0cDd6" as `0x${string}`;
const POOL = "0xd145F9626F847249d6034289ef44DaA63A39D0B2" as `0x${string}`;

const SALE_ABI = [
  { inputs: [], name: "getCurrentPrice", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "usdReserve", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "phase2Sold", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

const POOL_ABI = [
  { inputs: [], name: "getPrice", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "usdReserve", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "tokenReserve", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

async function main() {
  const pub = createPublicClient({ chain: tempoModerato, transport: http() });

  const salePrice   = await pub.readContract({ address: SALE, abi: SALE_ABI, functionName: "getCurrentPrice" }) as bigint;
  const poolPrice   = await pub.readContract({ address: POOL, abi: POOL_ABI, functionName: "getPrice" }) as bigint;
  const poolUsd     = await pub.readContract({ address: POOL, abi: POOL_ABI, functionName: "usdReserve" }) as bigint;
  const poolToken   = await pub.readContract({ address: POOL, abi: POOL_ABI, functionName: "tokenReserve" }) as bigint;
  const phase2Sold  = await pub.readContract({ address: SALE, abi: SALE_ABI, functionName: "phase2Sold" }) as bigint;

  console.log("=== PRICE CONTINUITY CHECK ===");
  console.log("Sale price (Phase2 end): $" + (Number(salePrice) / 1e6).toFixed(8));
  console.log("Pool price (DEX start) : $" + (Number(poolPrice) / 1e6).toFixed(8));
  console.log("");
  console.log("Pool USD reserve  : $" + (Number(poolUsd) / 1e6).toFixed(2));
  console.log("Pool token reserve: " + (Number(poolToken) / 1e18).toFixed(0) + " tokens");
  console.log("Phase2 sold       : " + (Number(phase2Sold) / 1e18).toFixed(0) + " tokens");
  console.log("");
  const diff = Math.abs(Number(salePrice) - Number(poolPrice)) / Number(salePrice) * 100;
  console.log("Price difference  : " + diff.toFixed(2) + "%");
  console.log(diff < 1 ? "OK PRICE CONTINUOUS (< 1% diff)" : diff < 5 ? "WARN price diff " + diff.toFixed(2) + "%" : "FAIL price drop " + diff.toFixed(2) + "%");
}
main().catch(e => { console.error(e); process.exit(1); });
