import { ethers } from "ethers";

const FACTORY_ADDRESS = "0xc2DAD5AF5E0746B3d0736283B166eacB48a96924";
const TARGET_SUFFIX   = "8888";

// ABI encode constructor args giong Solidity abi.encode
function encodeConstructorArgs(
  name: string, symbol: string, imageURI: string,
  description: string, creator: string, saleAddress: string
): string {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  return abiCoder.encode(
    ["string","string","string","string","address","address"],
    [name, symbol, imageURI, description, creator, saleAddress]
  );
}

// Mine salt sao cho CREATE2 address ket thuc "8888"
// predictedSale: address cua TokenSale se duoc deploy (tinh truoc bang nonce)
export async function mineSaltFor8888(
  name: string,
  symbol: string,
  imageURI: string,
  description: string,
  creator: string,
  predictedSale: string,
  tokenInitCode: string,  // MemeToken bytecode (lay tu artifacts)
  onProgress?: (iterations: number) => void
): Promise<{ salt: string; address: string }> {
  const constructorArgs = encodeConstructorArgs(name, symbol, imageURI, description, creator, predictedSale);
  const initCode        = tokenInitCode + constructorArgs.slice(2);
  const initCodeHash    = ethers.keccak256(initCode);

  let nonce = 0n;
  while (true) {
    const salt = ethers.zeroPadValue(ethers.toBeHex(nonce), 32);
    const addr = ethers.getCreate2Address(FACTORY_ADDRESS, salt, initCodeHash);
    if (addr.toLowerCase().endsWith(TARGET_SUFFIX)) {
      return { salt, address: addr };
    }
    nonce++;
    if (onProgress && nonce % 1000n === 0n) onProgress(Number(nonce));
    // Yield de browser khong freeze moi 5000 iterations
    if (nonce % 5000n === 0n) await new Promise(r => setTimeout(r, 0));
  }
}

// Predict TokenSale address dua tren factory address va nonce hien tai
export async function predictSaleAddress(
  provider: ethers.Provider,
  factoryAddress: string
): Promise<string> {
  const nonce = await provider.getTransactionCount(factoryAddress);
  // TokenSale la contract dau tien factory deploy trong createMeme (nonce hien tai)
  return ethers.getCreateAddress({ from: factoryAddress, nonce });
}
