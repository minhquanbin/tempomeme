import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
const tempoModerato = defineChain({ id: 42431, name: "Tempo Moderato Testnet", nativeCurrency: { name: "USD", symbol: "USD", decimals: 18 }, rpcUrls: { default: { http: ["https://rpc.moderato.tempo.xyz"] } } });
const FACTORY = process.env.MEME_FACTORY_ADDRESS as `0x${string}`;
const PATH_USD = "0x20c0000000000000000000000000000000000000" as `0x${string}`;
const WAD = 10n ** 18n;
const fmt = (r: bigint) => (r / WAD).toString();
const fmtU = (r: bigint) => (Number(r) / 1e6).toFixed(4);
const fmtP = (r: bigint) => (Number(r) / 1e18).toExponential(4);
const FACTORY_ABI = [
  { inputs: [{ name: "name", type: "string" }, { name: "symbol", type: "string" }, { name: "imageURI", type: "string" }, { name: "description", type: "string" }, { name: "devBuyUSD", type: "uint256" }], name: "createMeme", outputs: [{ name: "token", type: "address" }, { name: "sale", type: "address" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "getAllTokens", outputs: [{ name: "", type: "address[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "token", type: "address" }], name: "tokenToSale", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
] as const;
const SALE_ABI = [
  { inputs: [], name: "getCurrentPrice", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getMarketCap", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "currentPhase", outputs: [{ name: "", type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "phase1Sold", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "usdReserve", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "tokensRemaining", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "usdIn", type: "uint256" }], name: "getBuyQuote", outputs: [{ name: "tokenOut", type: "uint256" }, { name: "phase", type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "usdIn", type: "uint256" }, { name: "minTokenOut", type: "uint256" }], name: "buy", outputs: [{ name: "tokenOut", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "tokenIn", type: "uint256" }, { name: "minUSDOut", type: "uint256" }], name: "sell", outputs: [{ name: "usdOut", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
] as const;
const ERC20_ABI = [
  { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;
async function main() {
  const account = privateKeyToAccount(process.env.TEMPO_PRIVATE_KEY as `0x${string}`);
  const wallet = createWalletClient({ account, chain: tempoModerato, transport: http() });
  const pub = createPublicClient({ chain: tempoModerato, transport: http() });
  console.log("=== [1] Tao token KHONG devBuy ===");
  const h1 = await wallet.writeContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "createMeme", args: ["V2NoDev", "V2ND", "https://i.imgur.com/test.png", "test", 0n] });
  await pub.waitForTransactionReceipt({ hash: h1 });
  const tokens1 = await pub.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "getAllTokens" }) as string[];
  const t1 = tokens1[tokens1.length - 1] as `0x${string}`;
  const s1 = await pub.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "tokenToSale", args: [t1] }) as `0x${string}`;
  const phase0 = await pub.readContract({ address: s1, abi: SALE_ABI, functionName: "currentPhase" });
  const price0 = await pub.readContract({ address: s1, abi: SALE_ABI, functionName: "getCurrentPrice" }) as bigint;
  const rem0 = await pub.readContract({ address: s1, abi: SALE_ABI, functionName: "tokensRemaining" }) as bigint;
  console.log("Phase      :", phase0, "(expect 1)");
  console.log("Price USD  :", fmtP(price0), "(expect 1.0000e-5)");
  console.log("Remaining  :", fmt(rem0), "(expect 1000000000)");
  console.log("");
  console.log("=== [2] Quote $10 (expect 990000 tokens) ===");
  const q10 = await pub.readContract({ address: s1, abi: SALE_ABI, functionName: "getBuyQuote", args: [10_000_000n] }) as [bigint, number];
  console.log("Quote $10  :", fmt(q10[0]), "tokens (expect 990000)");
  console.log("");
  console.log("=== [3] Quote $1000 (expect cap 100000000) ===");
  const q1000 = await pub.readContract({ address: s1, abi: SALE_ABI, functionName: "getBuyQuote", args: [1_000_000_000n] }) as [bigint, number];
  console.log("Quote $1000:", fmt(q1000[0]), "tokens (expect <=100000000)");
  console.log("");
  console.log("=== [4] Buy $10 + Sell ===");
  await wallet.writeContract({ address: PATH_USD, abi: ERC20_ABI, functionName: "approve", args: [s1, 10_000_000n] });
  const b1 = await wallet.writeContract({ address: s1, abi: SALE_ABI, functionName: "buy", args: [10_000_000n, 0n] });
  await pub.waitForTransactionReceipt({ hash: b1 });
  const sold1 = await pub.readContract({ address: s1, abi: SALE_ABI, functionName: "phase1Sold" }) as bigint;
  const mcap1 = await pub.readContract({ address: s1, abi: SALE_ABI, functionName: "getMarketCap" }) as bigint;
  const usdRes1 = await pub.readContract({ address: s1, abi: SALE_ABI, functionName: "usdReserve" }) as bigint;
  const price1 = await pub.readContract({ address: s1, abi: SALE_ABI, functionName: "getCurrentPrice" }) as bigint;
  console.log("Sold1      :", fmt(sold1), "tokens (expect 990000)");
  console.log("Price same :", fmtP(price1), "(expect 1.0000e-5)");
  console.log("Market cap :", fmtU(mcap1), "USD (expect ~9.90)");
  console.log("UsdReserve :", fmtU(usdRes1), "USD (expect ~9.90)");
  const sellAmt = sold1;
  const t1addr = t1;
  const T1_ABI = [{ inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" }] as const;
  await wallet.writeContract({ address: t1addr, abi: T1_ABI, functionName: "approve", args: [s1, sellAmt] });
  try {
    const sv = await wallet.writeContract({ address: s1, abi: SALE_ABI, functionName: "sell", args: [sellAmt, 0n] });
    await pub.waitForTransactionReceipt({ hash: sv });
    console.log("Sell OK    : success (expect no revert)");
  } catch(e: any) { console.log("Sell FAIL  :", e?.shortMessage || e?.message); }
  console.log("");
  console.log("=== [5] DevBuy $100 (expect 9900000 tokens = 9.9%) ===");
  await wallet.writeContract({ address: PATH_USD, abi: ERC20_ABI, functionName: "approve", args: [FACTORY, 100_000_000n] });
  const h2 = await wallet.writeContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "createMeme", args: ["V2Dev", "V2D", "https://i.imgur.com/test.png", "dev", 100_000_000n] });
  await pub.waitForTransactionReceipt({ hash: h2 });
  const tokens2 = await pub.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "getAllTokens" }) as string[];
  const t2 = tokens2[tokens2.length - 1] as `0x${string}`;
  const s2 = await pub.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "tokenToSale", args: [t2] }) as `0x${string}`;
  const sold2 = await pub.readContract({ address: s2, abi: SALE_ABI, functionName: "phase1Sold" }) as bigint;
  const pct = Number(sold2 * 10000n / (100_000_000n * WAD)) / 100;
  console.log("Dev bought :", fmt(sold2), "tokens (expect 9900000)");
  console.log("Phase1 pct :", pct, "% (expect 9.9%)");
  console.log("");
  console.log("=== KIEM TRA ===");
  const ok1 = q10[0] / WAD === 990000n;
  const ok2 = sold1 / WAD === 990000n;
  const ok3 = sold2 / WAD === 9900000n;
  console.log(ok1 ? "OK Quote $10" : "FAIL Quote: got " + fmt(q10[0]) + " expect 990000");
  console.log(ok2 ? "OK Buy $10" : "FAIL Buy: got " + fmt(sold1) + " expect 990000");
  console.log(ok3 ? "OK DevBuy $100" : "FAIL DevBuy: got " + fmt(sold2) + " expect 9900000");
  if (ok1 && ok2 && ok3) console.log("CONTRACT CHINH XAC 100%");
}
main().catch(e => { console.error(e); process.exit(1); });
