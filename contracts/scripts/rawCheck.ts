import { createPublicClient, http } from "viem";
import { defineChain } from "viem";

const tempoModerato = defineChain({
  id: 42431,
  name: "Tempo Moderato Testnet",
  nativeCurrency: { name: "USD", symbol: "USD", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.moderato.tempo.xyz"] } },
});

const FACTORY = "0xFdDa4eF9A71034b6157f29ffCF7a87644075E359" as `0x${string}`;
const TOKEN   = "0x6aee6bf01e9259302bc9beb92e453773a732a5d9" as `0x${string}`;

const FACTORY_ABI = [
  { inputs: [{ name: "token", type: "address" }], name: "tokenToCurve", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
] as const;

const CURVE_ABI = [
  { inputs: [], name: "getCurrentPrice", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getMarketCap", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "usdReserve", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

const TOKEN_ABI = [
  { inputs: [], name: "totalSupply", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

async function main() {
  const pub = createPublicClient({ chain: tempoModerato, transport: http() });
  const curveAddr = await pub.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "tokenToCurve", args: [TOKEN] }) as `0x${string}`;
  console.log("Curve:", curveAddr);

  const [price, mcap, usdReserve, supply] = await Promise.all([
    pub.readContract({ address: curveAddr, abi: CURVE_ABI, functionName: "getCurrentPrice" }),
    pub.readContract({ address: curveAddr, abi: CURVE_ABI, functionName: "getMarketCap" }),
    pub.readContract({ address: curveAddr, abi: CURVE_ABI, functionName: "usdReserve" }),
    pub.readContract({ address: TOKEN, abi: TOKEN_ABI, functionName: "totalSupply" }),
  ]);

  console.log("--- RAW VALUES ---");
  console.log("price raw:     ", price.toString());
  console.log("mcap raw:      ", mcap.toString());
  console.log("usdReserve raw:", usdReserve.toString());
  console.log("supply raw:    ", supply.toString());
  console.log("");
  console.log("--- DIVIDE ATTEMPTS ---");
  console.log("price /1e6: ", Number(price)/1e6);
  console.log("price /1e12:", Number(price)/1e12);
  console.log("price /1e18:", Number(price)/1e18);
  console.log("expected:    0.000000027939");
  console.log("");
  console.log("mcap /1e6: ", Number(mcap)/1e6);
  console.log("mcap /1e12:", Number(mcap)/1e12);
  console.log("mcap /1e18:", Number(mcap)/1e18);
  console.log("usdReserve /1e6:", Number(usdReserve)/1e6);
}

main().catch(e => { console.error(e); process.exit(1); });
