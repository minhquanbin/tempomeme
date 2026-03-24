import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";

const tempoModerato = defineChain({
  id: 42431,
  name: "Tempo Moderato Testnet",
  nativeCurrency: { name: "USD", symbol: "USD", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.moderato.tempo.xyz"] } },
});

const FACTORY = "0x28D7E80EBCd42d11A47b28E89dBeAd285472384F" as `0x${string}`;
const PATH_USD = "0x20c0000000000000000000000000000000000000" as `0x${string}`;

const FACTORY_ABI = [
  { inputs: [{ name: "name", type: "string" }, { name: "symbol", type: "string" }, { name: "imageURI", type: "string" }, { name: "description", type: "string" }], name: "createMeme", outputs: [{ name: "token", type: "address" }, { name: "curve", type: "address" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "getAllTokens", outputs: [{ name: "", type: "address[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "token", type: "address" }], name: "tokenToCurve", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
] as const;

const CURVE_ABI = [
  { inputs: [], name: "getCurrentPrice", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getMarketCap", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "usdReserve", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getGraduationProgress", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "usdIn", type: "uint256" }], name: "getBuyAmount", outputs: [{ name: "tokenOut", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

const ERC20_ABI = [
  { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" },
] as const;

async function main() {
  const account = privateKeyToAccount(process.env.TEMPO_PRIVATE_KEY as `0x${string}`);
  const wallet  = createWalletClient({ account, chain: tempoModerato, transport: http() });
  const pub     = createPublicClient({ chain: tempoModerato, transport: http() });

  // 1. Tao token moi
  console.log("Creating token...");
  const hash = await wallet.writeContract({
    address: FACTORY, abi: FACTORY_ABI, functionName: "createMeme",
    args: ["Price Check v2", "PCK2", "https://i.imgur.com/test.png", "Verify price fix"],
  });
  await pub.waitForTransactionReceipt({ hash });

  const tokens = await pub.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "getAllTokens" });
  const tokenAddr = tokens[tokens.length - 1] as `0x${string}`;
  const curveAddr = await pub.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "tokenToCurve", args: [tokenAddr] }) as `0x${string}`;
  console.log("Token:", tokenAddr);
  console.log("Curve:", curveAddr);

  // 2. Doc gia truoc khi mua
  const price0 = await pub.readContract({ address: curveAddr, abi: CURVE_ABI, functionName: "getCurrentPrice" });
  const [q1, q5, q10] = await Promise.all([
    pub.readContract({ address: curveAddr, abi: CURVE_ABI, functionName: "getBuyAmount", args: [1_000_000n] }),
    pub.readContract({ address: curveAddr, abi: CURVE_ABI, functionName: "getBuyAmount", args: [5_000_000n] }),
    pub.readContract({ address: curveAddr, abi: CURVE_ABI, functionName: "getBuyAmount", args: [10_000_000n] }),
  ]);

  console.log("");
  console.log("=== BEFORE BUY ===");
  console.log("Raw price:    ", price0.toString());
  console.log("Price /1e30:  $" + (Number(price0) / 1e30).toFixed(13));
  console.log("Expected:     $0.0000000279390");
  console.log("Quote $1  ->", (Number(q1)  / 1e18).toFixed(2), "tokens  (expected ~33,233,000)");
  console.log("Quote $5  ->", (Number(q5)  / 1e18).toFixed(2), "tokens  (expected ~164,900,000)");
  console.log("Quote $10 ->", (Number(q10) / 1e18).toFixed(2), "tokens  (expected ~327,300,000)");

  // 3. Mua $1 de xem gia thay doi
  console.log("");
  console.log("Buying $1...");
  const approveTx = await wallet.writeContract({ address: PATH_USD, abi: ERC20_ABI, functionName: "approve", args: [curveAddr, 1_000_000n] });
  await pub.waitForTransactionReceipt({ hash: approveTx });
  const buyTx = await wallet.writeContract({ address: curveAddr, abi: CURVE_ABI, functionName: "buy", args: [1_000_000n, 0n] });
  await pub.waitForTransactionReceipt({ hash: buyTx });

  const price1   = await pub.readContract({ address: curveAddr, abi: CURVE_ABI, functionName: "getCurrentPrice" });
  const mcap1    = await pub.readContract({ address: curveAddr, abi: CURVE_ABI, functionName: "getMarketCap" });
  const reserve1 = await pub.readContract({ address: curveAddr, abi: CURVE_ABI, functionName: "usdReserve" });
  const prog1    = await pub.readContract({ address: curveAddr, abi: CURVE_ABI, functionName: "getGraduationProgress" });

  console.log("");
  console.log("=== AFTER BUY $1 ===");
  console.log("Price /1e30:  $" + (Number(price1) / 1e30).toFixed(13));
  console.log("Mcap /1e6:    $" + (Number(mcap1)  / 1e6).toFixed(4));
  console.log("USD Reserve:  $" + (Number(reserve1) / 1e6).toFixed(4));
  console.log("Progress:     " + prog1.toString() + "%");

  console.log("");
  const priceNum = Number(price0) / 1e30;
  const expected = 30000 / 1073000191;
  const diff = Math.abs(priceNum - expected) / expected * 100;
  console.log("Price match pump.fun: ", diff < 1 ? "YES ✅" : "NO ❌  diff=" + diff.toFixed(4) + "%");
}

main().catch(e => { console.error(e); process.exit(1); });
