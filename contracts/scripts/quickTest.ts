import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";

const tempoModerato = defineChain({
  id: 42431,
  name: "Tempo Moderato Testnet",
  nativeCurrency: { name: "USD", symbol: "USD", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.moderato.tempo.xyz"] } },
});

const FACTORY = "0x110C2f30A2884545b6eA33193f4D881612ddA32D" as `0x${string}`;
const PATH_USD = "0x20c0000000000000000000000000000000000000" as `0x${string}`;

const FACTORY_ABI = [
  { inputs: [{ name: "name", type: "string" }, { name: "symbol", type: "string" }, { name: "imageURI", type: "string" }, { name: "description", type: "string" }], name: "createMeme", outputs: [{ name: "token", type: "address" }, { name: "curve", type: "address" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "getTokenCount", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getAllTokens", outputs: [{ name: "", type: "address[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "token", type: "address" }], name: "tokenToCurve", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
] as const;

const CURVE_ABI = [
  { inputs: [], name: "getCurrentPrice", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getGraduationProgress", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "usdIn", type: "uint256" }], name: "getBuyAmount", outputs: [{ name: "tokenOut", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "usdIn", type: "uint256" }, { name: "minTokenOut", type: "uint256" }], name: "buy", outputs: [{ name: "tokenOut", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
] as const;

const ERC20_ABI = [
  { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

async function main() {
  const account = privateKeyToAccount(process.env.TEMPO_PRIVATE_KEY as `0x${string}`);
  const wallet  = createWalletClient({ account, chain: tempoModerato, transport: http() });
  const pub     = createPublicClient({ chain: tempoModerato, transport: http() });
  console.log("Wallet:", account.address);

  const hash = await wallet.writeContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "createMeme", args: ["Test Fixed", "TFIX", "https://i.imgur.com/test.png", "Bug fix test"] });
  await pub.waitForTransactionReceipt({ hash });
  console.log("createMeme OK");

  const tokens = await pub.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "getAllTokens" });
  const tokenAddr = tokens[tokens.length - 1] as `0x${string}`;
  const curveAddr = await pub.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "tokenToCurve", args: [tokenAddr] }) as `0x${string}`;
  console.log("Token:", tokenAddr);
  console.log("Curve:", curveAddr);

  const price    = await pub.readContract({ address: curveAddr, abi: CURVE_ABI, functionName: "getCurrentPrice" });
  const progress = await pub.readContract({ address: curveAddr, abi: CURVE_ABI, functionName: "getGraduationProgress" });
  console.log("Price: $" + (Number(price) / 1e18).toFixed(8));
  console.log("Progress:", progress.toString() + "%");

  const BUY = 5n * 1_000_000n;
  const approveTx = await wallet.writeContract({ address: PATH_USD, abi: ERC20_ABI, functionName: "approve", args: [curveAddr, BUY] });
  await pub.waitForTransactionReceipt({ hash: approveTx });

  const buyTx = await wallet.writeContract({ address: curveAddr, abi: CURVE_ABI, functionName: "buy", args: [BUY, 0n] });
  await pub.waitForTransactionReceipt({ hash: buyTx });
  console.log("Buy OK:", buyTx);

  const priceAfter = await pub.readContract({ address: curveAddr, abi: CURVE_ABI, functionName: "getCurrentPrice" });
  console.log("Price after: $" + (Number(priceAfter) / 1e18).toFixed(8));
  console.log("ALL TESTS PASSED!");
}

main().catch(e => { console.error(e); process.exit(1); });
