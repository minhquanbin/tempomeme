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

const FACTORY_ADDRESS = "0xBb81df340B99364089b27c5fDAB5e7db0851320e" as `0x${string}`;

const FACTORY_ABI = [
  {
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "imageURI", type: "string" },
      { name: "description", type: "string" },
    ],
    name: "createMeme",
    outputs: [
      { name: "token", type: "address" },
      { name: "curve", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getTokenCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllTokens",
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

async function main() {
  const privateKey = process.env.TEMPO_PRIVATE_KEY as `0x${string}`;
  if (!privateKey) throw new Error("TEMPO_PRIVATE_KEY not set in .env");

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

  console.log("Calling createMeme from:", account.address);

  const hash = await walletClient.writeContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "createMeme",
    args: ["Doge on Tempo", "DOGET", "https://i.imgur.com/test.png", "First meme on Tempo!"],
  });

  console.log("TX hash:", hash);
  console.log("Waiting for confirmation...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("Confirmed! Block:", receipt.blockNumber.toString());

  const count = await publicClient.readContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getTokenCount",
  });
  console.log("Token count:", count.toString());

  const tokens = await publicClient.readContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getAllTokens",
  });
  console.log("All tokens:", tokens);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
