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
  { inputs: [], name: "P1_NUM", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "P1_DEN", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "phase1Sold", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "usdIn", type: "uint256" }], name: "getBuyQuote", outputs: [{ name: "tokenOut", type: "uint256" }, { name: "phase", type: "uint8" }], stateMutability: "view", type: "function" },
] as const;

async function main() {
  const pub = createPublicClient({ chain: tempoModerato, transport: http() });
  const tokens = await pub.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "getAllTokens" });
  const lastToken = tokens[tokens.length - 1] as `0x${string}`;
  const saleAddr  = await pub.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "tokenToSale", args: [lastToken] }) as `0x${string}`;
  console.log("Sale:", saleAddr);

  const p1num = await pub.readContract({ address: saleAddr, abi: SALE_ABI, functionName: "P1_NUM" }) as bigint;
  const p1den = await pub.readContract({ address: saleAddr, abi: SALE_ABI, functionName: "P1_DEN" }) as bigint;
  console.log("P1_NUM:", p1num.toString());
  console.log("P1_DEN:", p1den.toString());

  // Tinh tay: $1 = 1_000_000 usdc-raw, fee 1% -> netUsd = 990_000
  const netUsd = 990_000n;
  const expected = netUsd * p1num / p1den;
  console.log("Expected tokenOut (raw):", expected.toString());
  console.log("Expected tokenOut (human):", (Number(expected) / 1e18).toFixed(0), "tokens");

  const result = await pub.readContract({ address: saleAddr, abi: SALE_ABI, functionName: "getBuyQuote", args: [1_000_000n] });
  console.log("getBuyQuote raw result:", result);
  console.log("tokenOut raw:", result[0].toString());
  console.log("tokenOut human:", (Number(result[0]) / 1e18).toFixed(0), "tokens");

  const sold = await pub.readContract({ address: saleAddr, abi: SALE_ABI, functionName: "phase1Sold" }) as bigint;
  console.log("phase1Sold raw:", sold.toString());
  console.log("phase1Sold human:", (Number(sold) / 1e18).toFixed(0), "tokens");
}
main().catch(e => { console.error(e); process.exit(1); });
