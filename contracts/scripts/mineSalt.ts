import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

const TARGET_SUFFIX = "8888";

async function main() {
  const factoryAddress  = process.env.MEME_FACTORY_ADDRESS!;
  const usdToken        = process.env.USD_TOKEN_ADDRESS!;
  const feeRecipient    = process.env.FEE_RECIPIENT_ADDRESS!;

  // Doc args tu command line
  const [,, name, symbol, imageURI, description, creator, nonceStr] = process.argv;
  const creatorNonce = parseInt(nonceStr ?? "0");

  // Load artifacts
  const saleArt  = JSON.parse(fs.readFileSync(path.join(__dirname, "../artifacts/contracts/TokenSale.sol/TokenSale.json"), "utf8"));
  const tokenArt = JSON.parse(fs.readFileSync(path.join(__dirname, "../artifacts/contracts/MemeToken.sol/MemeToken.json"), "utf8"));

  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  // Buoc 1: Tinh truoc TokenSale address (factory deploy bang new, khong CREATE2)
  // Lay nonce hien tai cua factory tu chain de predict address
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const factoryNonce = await provider.getTransactionCount(factoryAddress);
  // TokenSale la contract thu (factoryNonce) duoc deploy boi factory
  const predictedSale = ethers.getCreateAddress({ from: factoryAddress, nonce: factoryNonce + 1 });
  console.log(`Predicted TokenSale: ${predictedSale}`);

  // Buoc 2: Tinh initCodeHash cua MemeToken voi predictedSale
  const constructorArgs = abiCoder.encode(
    ["string","string","string","string","address","address"],
    [name, symbol, imageURI, description, creator, predictedSale]
  );
  const initCode     = tokenArt.bytecode + constructorArgs.slice(2);
  const initCodeHash = ethers.keccak256(initCode);

  // Buoc 3: Mine salt
  console.log(`Mining salt for suffix ...${TARGET_SUFFIX} ...`);
  let nonce = 0n;
  const start = Date.now();
  while (true) {
    const salt = ethers.zeroPadValue(ethers.toBeHex(nonce), 32);
    const addr = ethers.getCreate2Address(factoryAddress, salt, initCodeHash);
    if (addr.toLowerCase().endsWith(TARGET_SUFFIX)) {
      const ms = Date.now() - start;
      console.log(`\\nFound after ${nonce} iterations (${ms}ms)`);
      console.log(`Token address : ${addr}`);
      console.log(`Salt (bytes32): ${salt}`);
      break;
    }
    nonce++;
    if (nonce % 10000n === 0n) process.stdout.write(`\\r${nonce} iterations...`);
  }
}

main().catch(console.error);
