import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";

const tempoModerato = defineChain({
  id: 42431,
  name: "Tempo Moderato Testnet",
  nativeCurrency: { name: "USD", symbol: "USD", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.moderato.tempo.xyz"] } },
});

const FACTORY  = process.env.MEME_FACTORY_ADDRESS as `0x${string}`;
const PATH_USD = "0x20c0000000000000000000000000000000000000" as `0x${string}`;

const FACTORY_ABI = [
  { inputs: [{ name: "name", type: "string" }, { name: "symbol", type: "string" }, { name: "imageURI", type: "string" }, { name: "description", type: "string" }], name: "createMeme", outputs: [{ name: "token", type: "address" }, { name: "curve", type: "address" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "getAllTokens", outputs: [{ name: "", type: "address[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "token", type: "address" }], name: "tokenToCurve", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
] as const;

const CURVE_ABI = [
  { inputs: [], name: "getCurrentPrice", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getMarketCap", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getGraduationProgress", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "usdIn", type: "uint256" }], name: "getBuyAmount", outputs: [{ name: "tokenOut", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "usdIn", type: "uint256" }, { name: "minTokenOut", type: "uint256" }], name: "buy", outputs: [{ name: "tokenOut", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
] as const;

const ERC20_ABI = [
  { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" },
] as const;

async function main() {
  console.log("FACTORY:", FACTORY);
  const account = privateKeyToAccount(process.env.TEMPO_PRIVATE_KEY as `0x${string}`);
  const wallet  = createWalletClient({ account, chain: tempoModerato, transport: http() });
  const pub     = createPublicClient({ chain: tempoModerato, transport: http() });
  console.log("=== Tao token test ===");
  const h = await wallet.writeContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "createMeme", args: ["Verify Fix", "VFX", "https://i.imgur.com/test.png", "verify"] });
  await pub.waitForTransactionReceipt({ hash: h });
  const tokens    = await pub.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "getAllTokens" });
  const tokenAddr = tokens[tokens.length - 1] as `0x${string}`;
  const curveAddr = await pub.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "tokenToCurve", args: [tokenAddr] }) as `0x${string}`;
  console.log("Token:", tokenAddr);
  console.log("Curve:", curveAddr);
  const p0 = await pub.readContract({ address: curveAddr, abi: CURVE_ABI, functionName: "getCurrentPrice" }) as bigint;
  const m0 = await pub.readContract({ address: curveAddr, abi: CURVE_ABI, functionName: "getMarketCap" }) as bigint;
  console.log("=== BEFORE BUY ===");
  console.log("Price $   : $" + (Number(p0) / 1e18 / 1e6).toFixed(10));
  console.log("Mcap $    : $" + (Number(m0) / 1e6).toFixed(4));
  for (const amt of [1_000_000n, 10_000_000n, 100_000_000n]) {
    const q = await pub.readContract({ address: curveAddr, abi: CURVE_ABI, functionName: "getBuyAmount", args: [amt] }) as bigint;
    console.log("Quote $" + Number(amt)/1e6 + " -> " + (Number(q)/1e18).toFixed(0) + " tokens");
  }
  console.log("=== BUY $1 ===");
  const a = await wallet.writeContract({ address: PATH_USD, abi: ERC20_ABI, functionName: "approve", args: [curveAddr, 1_000_000n] });
  await pub.waitForTransactionReceipt({ hash: a });
  const bx = await wallet.writeContract({ address: curveAddr, abi: CURVE_ABI, functionName: "buy", args: [1_000_000n, 0n] });
  await pub.waitForTransactionReceipt({ hash: bx });
  const p1 = await pub.readContract({ address: curveAddr, abi: CURVE_ABI, functionName: "getCurrentPrice" }) as bigint;
  const m1 = await pub.readContract({ address: curveAddr, abi: CURVE_ABI, functionName: "getMarketCap" }) as bigint;
  const g1 = await pub.readContract({ address: curveAddr, abi: CURVE_ABI, functionName: "getGraduationProgress" }) as bigint;
  console.log("=== AFTER BUY ===");
  console.log("Price $   : $" + (Number(p1) / 1e18 / 1e6).toFixed(10));
  console.log("Mcap $    : $" + (Number(m1) / 1e6).toFixed(4) + "  (phai > $0!!)");
  console.log("Progress  :", g1.toString() + "%");
  console.log(m1 > 0n ? "OK getMarketCap() DA FIX XONG" : "FAIL van con loi");
}
main().catch(e => { console.error(e); process.exit(1); });
