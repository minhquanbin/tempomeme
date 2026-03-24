import { createPublicClient, http } from "viem";
import { defineChain } from "viem";

const tempoModerato = defineChain({
  id: 42431,
  name: "Tempo Moderato Testnet",
  nativeCurrency: { name: "USD", symbol: "USD", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.moderato.tempo.xyz"] } },
});

const FACTORY = process.env.MEME_FACTORY_ADDRESS as `0x${string}`;

const FACTORY_ABI = [
  { inputs: [], name: "getAllTokens", outputs: [{ name: "", type: "address[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "token", type: "address" }], name: "tokenToSale", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
] as const;

const SALE_ABI = [
  { inputs: [], name: "getCurrentPrice", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getMarketCap",    outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "currentPhase",    outputs: [{ name: "", type: "uint8"   }], stateMutability: "view", type: "function" },
  { inputs: [], name: "phase1Sold",      outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "phase2Sold",      outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "usdReserve",      outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "tokensRemaining", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalSold",       outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

const WAD = 10n ** 18n;

async function main() {
  const pub = createPublicClient({ chain: tempoModerato, transport: http() });
  const tokens = await pub.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "getAllTokens" });
  console.log("Total tokens:", tokens.length);

  for (const addr of tokens) {
    const a = addr as `0x${string}`;
    const sale = await pub.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "tokenToSale", args: [a] }) as `0x${string}`;
    const [price, mcap, phase, p1Sold, p2Sold, usdRes, remaining, totalSold] = await Promise.all([
      pub.readContract({ address: sale, abi: SALE_ABI, functionName: "getCurrentPrice" }) as Promise<bigint>,
      pub.readContract({ address: sale, abi: SALE_ABI, functionName: "getMarketCap" }) as Promise<bigint>,
      pub.readContract({ address: sale, abi: SALE_ABI, functionName: "currentPhase" }) as Promise<number>,
      pub.readContract({ address: sale, abi: SALE_ABI, functionName: "phase1Sold" }) as Promise<bigint>,
      pub.readContract({ address: sale, abi: SALE_ABI, functionName: "phase2Sold" }) as Promise<bigint>,
      pub.readContract({ address: sale, abi: SALE_ABI, functionName: "usdReserve" }) as Promise<bigint>,
      pub.readContract({ address: sale, abi: SALE_ABI, functionName: "tokensRemaining" }) as Promise<bigint>,
      pub.readContract({ address: sale, abi: SALE_ABI, functionName: "totalSold" }) as Promise<bigint>,
    ]);
    console.log("---");
    console.log("Token  :", a);
    console.log("Sale   :", sale);
    console.log("Phase  :", phase);
    console.log("Price  : $" + (Number(price)/1e18).toFixed(8));
    console.log("Mcap   : $" + (Number(mcap)/1e6).toFixed(2));
    console.log("UsdRes : $" + (Number(usdRes)/1e6).toFixed(2));
    console.log("P1Sold :", (p1Sold/WAD).toString(), "tokens");
    console.log("P2Sold :", (p2Sold/WAD).toString(), "tokens");
    console.log("Total  :", (totalSold/WAD).toString(), "tokens");
    console.log("Remain :", (remaining/WAD).toString(), "tokens");
    console.log("P1 pct :", Number(p1Sold * 100n / (100_000_000n * WAD)).toFixed(1) + "%");
  }
}
main().catch(e => { console.error(e); process.exit(1); });
