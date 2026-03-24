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
  { inputs: [{ name: "name", type: "string" }, { name: "symbol", type: "string" }, { name: "imageURI", type: "string" }, { name: "description", type: "string" }, { name: "devBuyUSD", type: "uint256" }, { name: "tokenSalt", type: "bytes32" }], name: "createMeme", outputs: [{ name: "token", type: "address" }, { name: "sale", type: "address" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "getAllTokens", outputs: [{ name: "", type: "address[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "token", type: "address" }], name: "tokenToSale", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "token", type: "address" }], name: "tokenToPool", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
] as const;

const SALE_ABI = [
  { inputs: [], name: "currentPhase", outputs: [{ name: "", type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "graduated", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "usdReserve", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "liquidityPool", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "usdIn", type: "uint256" }, { name: "minTokenOut", type: "uint256" }], name: "buy", outputs: [{ name: "tokenOut", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
] as const;

const POOL_ABI = [
  { inputs: [], name: "graduated", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "tokenReserve", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "usdReserve", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "usdIn", type: "uint256" }, { name: "minTokenOut", type: "uint256" }], name: "buyToken", outputs: [{ name: "tokenOut", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
] as const;

const ERC20_ABI = [
  { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

async function main() {
  const account = privateKeyToAccount(process.env.TEMPO_PRIVATE_KEY as `0x${string}`);
  const wallet  = createWalletClient({ account, chain: tempoModerato, transport: http() });
  const pub     = createPublicClient({ chain: tempoModerato, transport: http() });

  console.log("=== Create token ===");
  const salt = "0x" + "0".repeat(64) as `0x${string}`;
  const h = await wallet.writeContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "createMeme", args: ["Grad Test", "GRAD", "https://i.imgur.com/test.png", "test", 0n, salt as `0x${string}`] });
  await pub.waitForTransactionReceipt({ hash: h });
  const tokens = await pub.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "getAllTokens" });
  const tokenAddr = tokens[tokens.length - 1] as `0x${string}`;
  const saleAddr  = await pub.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "tokenToSale", args: [tokenAddr] }) as `0x${string}`;
  console.log("Token:", tokenAddr);
  console.log("Sale: ", saleAddr);

  console.log("\n=== Buy $1000 (Phase 1) ===");
  const usd1k = 1_000_000_000n;
  let a = await wallet.writeContract({ address: PATH_USD, abi: ERC20_ABI, functionName: "approve", args: [saleAddr, usd1k] });
  await pub.waitForTransactionReceipt({ hash: a });
  let b = await wallet.writeContract({ address: saleAddr, abi: SALE_ABI, functionName: "buy", args: [usd1k, 0n] });
  await pub.waitForTransactionReceipt({ hash: b });
  let phase = await pub.readContract({ address: saleAddr, abi: SALE_ABI, functionName: "currentPhase" });
  let usdRes = await pub.readContract({ address: saleAddr, abi: SALE_ABI, functionName: "usdReserve" }) as bigint;
  console.log("Phase   :", phase, "(expect 1)");
  console.log("Reserve : $" + (Number(usdRes)/1e6).toFixed(2));

  console.log("\n=== Buy $68000 (Phase 2, near graduation) ===");
  const usd68k = 68_000_000_000n;
  a = await wallet.writeContract({ address: PATH_USD, abi: ERC20_ABI, functionName: "approve", args: [saleAddr, usd68k] });
  await pub.waitForTransactionReceipt({ hash: a });
  b = await wallet.writeContract({ address: saleAddr, abi: SALE_ABI, functionName: "buy", args: [usd68k, 0n] });
  await pub.waitForTransactionReceipt({ hash: b });
  usdRes = await pub.readContract({ address: saleAddr, abi: SALE_ABI, functionName: "usdReserve" }) as bigint;
  console.log("Reserve : $" + (Number(usdRes)/1e6).toFixed(2), "(expect ~$68,310)");

  console.log("\n=== Buy $2000 (trigger graduation) ===");
  const usd2k = 2_000_000_000n;
  const balBefore = await pub.readContract({ address: PATH_USD, abi: ERC20_ABI, functionName: "balanceOf", args: [account.address] }) as bigint;
  a = await wallet.writeContract({ address: PATH_USD, abi: ERC20_ABI, functionName: "approve", args: [saleAddr, usd2k] });
  await pub.waitForTransactionReceipt({ hash: a });
  b = await wallet.writeContract({ address: saleAddr, abi: SALE_ABI, functionName: "buy", args: [usd2k, 0n] });
  await pub.waitForTransactionReceipt({ hash: b });
  const balAfter = await pub.readContract({ address: PATH_USD, abi: ERC20_ABI, functionName: "balanceOf", args: [account.address] }) as bigint;
  console.log("USD spent: $" + (Number(balBefore - balAfter)/1e6).toFixed(2));

  // Read pool address AFTER graduation
  const poolAddr = await pub.readContract({ address: saleAddr, abi: SALE_ABI, functionName: "liquidityPool" }) as `0x${string}`;
  const saleGrad = await pub.readContract({ address: saleAddr, abi: SALE_ABI, functionName: "graduated" }) as boolean;
  console.log("\n=== Graduation Check ===");
  console.log("Sale graduated:", saleGrad, "(expect true)");
  console.log("Pool address  :", poolAddr);

  const poolGrad   = await pub.readContract({ address: poolAddr, abi: POOL_ABI, functionName: "graduated" }) as boolean;
  const poolToken  = await pub.readContract({ address: poolAddr, abi: POOL_ABI, functionName: "tokenReserve" }) as bigint;
  const poolUsd    = await pub.readContract({ address: poolAddr, abi: POOL_ABI, functionName: "usdReserve" }) as bigint;
  console.log("Pool graduated:", poolGrad, "(expect true)");
  console.log("Pool tokens   :", (Number(poolToken)/1e18).toFixed(0), "tokens");
  console.log("Pool USD      : $" + (Number(poolUsd)/1e6).toFixed(2), "(expect ~$68,000)");

  console.log("\n=== Buy on DEX Pool ===");
  const usd100 = 100_000_000n;
  a = await wallet.writeContract({ address: PATH_USD, abi: ERC20_ABI, functionName: "approve", args: [poolAddr, usd100] });
  await pub.waitForTransactionReceipt({ hash: a });
  b = await wallet.writeContract({ address: poolAddr, abi: POOL_ABI, functionName: "buyToken", args: [usd100, 0n] });
  await pub.waitForTransactionReceipt({ hash: b });
  const poolUsd2 = await pub.readContract({ address: poolAddr, abi: POOL_ABI, functionName: "usdReserve" }) as bigint;
  console.log("Pool USD after buy: $" + (Number(poolUsd2)/1e6).toFixed(2));

  console.log("\n============================");
  const ok = saleGrad && poolGrad && poolToken > 0n && poolAddr !== "0x0000000000000000000000000000000000000000";
  console.log(ok ? "OK GRADUATION COMPLETE" : "FAIL - check errors above");
  console.log("============================");
}
main().catch(e => { console.error(e); process.exit(1); });

