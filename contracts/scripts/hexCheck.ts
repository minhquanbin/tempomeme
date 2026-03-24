import { createPublicClient, http } from "viem";
import { defineChain } from "viem";

const tempoModerato = defineChain({
  id: 42431,
  name: "Tempo Moderato Testnet",
  nativeCurrency: { name: "USD", symbol: "USD", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.moderato.tempo.xyz"] } },
});

const CURVE = "0x2F5A4059435cc7E046dCeE9b86DC8d5078A25703" as `0x${string}`;

const ABI = [
  { inputs: [], name: "getCurrentPrice", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getMarketCap", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

async function main() {
  const pub = createPublicClient({ chain: tempoModerato, transport: http() });
  const price = await pub.readContract({ address: CURVE, abi: ABI, functionName: "getCurrentPrice" }) as bigint;
  const mcap  = await pub.readContract({ address: CURVE, abi: ABI, functionName: "getMarketCap" }) as bigint;

  // Dung BigInt de tranh JS precision loss
  console.log("price bigint:", price.toString());
  console.log("price hex:   ", price.toString(16));
  console.log("mcap bigint: ", mcap.toString());
  console.log("");
  // So sanh voi expected
  const expected = 27939n * 10n**24n; // 0.000000027939 * 1e30
  console.log("expected:    ", expected.toString());
  console.log("expected hex:", expected.toString(16));
  console.log("");
  console.log("price === expected?", price === expected);
  console.log("digits in price:   ", price.toString().length);
  console.log("digits in expected:", expected.toString().length);
  console.log("");
  // Hien thi dung
  const priceDisplay = price * 10000000000n / (10n**30n);
  console.log("price * 1e10 / 1e30 (integer):", priceDisplay.toString(), "-> $0.0" + priceDisplay.toString().padStart(9,"0"));
}

main().catch(e => { console.error(e); process.exit(1); });
