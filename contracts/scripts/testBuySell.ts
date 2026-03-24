import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";

const tempoModerato = defineChain({
  id: 42431,
  name: "Tempo Moderato Testnet",
  nativeCurrency: { name: "USD", symbol: "USD", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.moderato.tempo.xyz"] },
  },
});

// ── Addresses ─────────────────────────────────────────────
const FACTORY_ADDRESS  = "0x500FA605c64c31238227684865492946BAF93E26" as `0x${string}`;
const TOKEN_ADDRESS    = "0xCF225dCc36F4dfC8bfeCd079aC140D6F754ed4A2" as `0x${string}`;
const PATH_USD         = "0x20c0000000000000000000000000000000000000" as `0x${string}`;

// ── ABIs ──────────────────────────────────────────────────
const FACTORY_ABI = [
  {
    inputs: [{ name: "token", type: "address" }],
    name: "tokenToCurve",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const CURVE_ABI = [
  {
    inputs: [{ name: "usdIn", type: "uint256" }],
    name: "getBuyAmount",
    outputs: [{ name: "tokenOut", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenIn", type: "uint256" }],
    name: "getSellAmount",
    outputs: [{ name: "usdOut", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getCurrentPrice",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getMarketCap",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "usdReserve",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "usdIn", type: "uint256" },
      { name: "minTokenOut", type: "uint256" },
    ],
    name: "buy",
    outputs: [{ name: "tokenOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "tokenIn", type: "uint256" },
      { name: "minUSDOut", type: "uint256" },
    ],
    name: "sell",
    outputs: [{ name: "usdOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

function fmt6(n: bigint) { return (Number(n) / 1e6).toFixed(6); }
function fmt18(n: bigint) { return (Number(n) / 1e18).toFixed(4); }

async function main() {
  const privateKey = process.env.TEMPO_PRIVATE_KEY as `0x${string}`;
  const account = privateKeyToAccount(privateKey);

  const walletClient = createWalletClient({
    account,
    chain: tempoModerato,
    transport: http("https://rpc.moderato.tempo.xyz"),
  });

  const publicClient = createPublicClient({
    chain: tempoModerato,
    transport: http("https://rpc.moderato.tempo.xyz"),
  });

  // ── Lấy curve address ────────────────────────────────────
  const curveAddress = await publicClient.readContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "tokenToCurve",
    args: [TOKEN_ADDRESS],
  }) as `0x${string}`;
  console.log("BondingCurve address:", curveAddress);

  // ── Trạng thái ban đầu ───────────────────────────────────
  const priceBefore = await publicClient.readContract({
    address: curveAddress, abi: CURVE_ABI, functionName: "getCurrentPrice",
  });
  const mcapBefore = await publicClient.readContract({
    address: curveAddress, abi: CURVE_ABI, functionName: "getMarketCap",
  });
  const usdBalBefore = await publicClient.readContract({
    address: PATH_USD, abi: ERC20_ABI, functionName: "balanceOf",
    args: [account.address],
  });

  console.log("\n─── BEFORE BUY ───────────────────────────────");
  console.log("Price:      $", fmt6(priceBefore), "per token");
  console.log("Market cap: $", fmt6(mcapBefore));
  console.log("USD balance:", fmt6(usdBalBefore), "USD");

  // ── Quote: mua $10 thì nhận bao nhiêu token? ─────────────
  const BUY_AMOUNT = 10n * 1_000_000n; // $10 (6 decimals)
  const expectedTokens = await publicClient.readContract({
    address: curveAddress, abi: CURVE_ABI,
    functionName: "getBuyAmount", args: [BUY_AMOUNT],
  });
  console.log("\nQuote: spend $10 → receive", fmt18(expectedTokens), "DOGET");

  // ── Approve pathUSD cho curve ────────────────────────────
  console.log("\nApproving pathUSD...");
  const approveHash = await walletClient.writeContract({
    address: PATH_USD, abi: ERC20_ABI,
    functionName: "approve",
    args: [curveAddress, BUY_AMOUNT],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });
  console.log("✅ Approved");

  // ── BUY ──────────────────────────────────────────────────
  console.log("\nBuying $10 worth of DOGET...");
  const buyHash = await walletClient.writeContract({
    address: curveAddress, abi: CURVE_ABI,
    functionName: "buy",
    args: [BUY_AMOUNT, 0n], // minTokenOut = 0 (no slippage protection for test)
  });
  await publicClient.waitForTransactionReceipt({ hash: buyHash });
  console.log("✅ Buy TX:", buyHash);

  // ── Trạng thái sau khi mua ───────────────────────────────
  const priceAfterBuy = await publicClient.readContract({
    address: curveAddress, abi: CURVE_ABI, functionName: "getCurrentPrice",
  });
  const tokenBal = await publicClient.readContract({
    address: TOKEN_ADDRESS, abi: ERC20_ABI,
    functionName: "balanceOf", args: [account.address],
  });

  console.log("\n─── AFTER BUY ────────────────────────────────");
  console.log("Price:         $", fmt6(priceAfterBuy), "per token");
  console.log("DOGET balance:", fmt18(tokenBal), "DOGET");
  console.log("Price change:  +", (Number(priceAfterBuy - priceBefore) / Number(priceBefore) * 100).toFixed(4), "%");

  // ── SELL (bán 50% token vừa mua) ─────────────────────────
  const sellAmount = tokenBal / 2n;
  const expectedUSD = await publicClient.readContract({
    address: curveAddress, abi: CURVE_ABI,
    functionName: "getSellAmount", args: [sellAmount],
  });
  console.log("\nQuote: sell", fmt18(sellAmount), "DOGET → receive $", fmt6(expectedUSD));

  // Approve token cho curve
  console.log("\nApproving DOGET for sell...");
  const approveTokenHash = await walletClient.writeContract({
    address: TOKEN_ADDRESS, abi: ERC20_ABI,
    functionName: "approve", args: [curveAddress, sellAmount],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveTokenHash });

  console.log("Selling", fmt18(sellAmount), "DOGET...");
  const sellHash = await walletClient.writeContract({
    address: curveAddress, abi: CURVE_ABI,
    functionName: "sell", args: [sellAmount, 0n],
  });
  await publicClient.waitForTransactionReceipt({ hash: sellHash });
  console.log("✅ Sell TX:", sellHash);

  // ── Trạng thái cuối ───────────────────────────────────────
  const priceAfterSell = await publicClient.readContract({
    address: curveAddress, abi: CURVE_ABI, functionName: "getCurrentPrice",
  });
  const tokenBalFinal = await publicClient.readContract({
    address: TOKEN_ADDRESS, abi: ERC20_ABI,
    functionName: "balanceOf", args: [account.address],
  });
  const usdBalFinal = await publicClient.readContract({
    address: PATH_USD, abi: ERC20_ABI,
    functionName: "balanceOf", args: [account.address],
  });

  console.log("\n─── FINAL STATE ──────────────────────────────");
  console.log("Price:         $", fmt6(priceAfterSell), "per token");
  console.log("DOGET balance:", fmt18(tokenBalFinal), "DOGET");
  console.log("USD balance:  $", fmt6(usdBalFinal));
  console.log("USD spent (fee):", fmt6(usdBalBefore - usdBalFinal), "USD");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
