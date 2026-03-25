export { tempoModerato } from "../lib/wagmi";


export const FACTORY_ADDRESS = "0x1478E73C61A0dBD2C8DC45C542137b5cC2E9D142" as const;
export const PATH_USD = "0x20c0000000000000000000000000000000000000" as const;

export const FACTORY_ABI = [
  { inputs: [{ name: "name", type: "string" }, { name: "symbol", type: "string" }, { name: "imageURI", type: "string" }, { name: "description", type: "string" }, { name: "devBuyUSD", type: "uint256" }, { name: "tokenSalt", type: "bytes32" }], name: "createMeme", outputs: [{ name: "token", type: "address" }, { name: "sale", type: "address" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "getAllTokens", outputs: [{ name: "", type: "address[]" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getTokenCount", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "token", type: "address" }], name: "tokenToSale", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "token", type: "address" }], name: "tokenToPool", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "creator", type: "address" }], name: "getCreatorTokens", outputs: [{ name: "", type: "address[]" }], stateMutability: "view", type: "function" },
  { anonymous: false, inputs: [{ indexed: true, name: "token", type: "address" }, { indexed: true, name: "sale", type: "address" }, { indexed: true, name: "creator", type: "address" }, { name: "name", type: "string" }, { name: "symbol", type: "string" }, { name: "imageURI", type: "string" }, { name: "devBuyUSD", type: "uint256" }], name: "MemeCreated", type: "event" },
] as const;

export const SALE_ABI = [
  { inputs: [], name: "getCurrentPrice", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getMarketCap", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "currentPhase", outputs: [{ name: "", type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "phase1Sold", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "phase2Sold", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "usdReserve", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "graduated", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "liquidityPool", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "tokensRemaining", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalSold", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "GRADUATION_TARGET", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "PHASE1_SUPPLY", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "token", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "usdIn", type: "uint256" }], name: "getBuyQuote", outputs: [{ name: "tokenOut", type: "uint256" }, { name: "phase", type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "tokenIn", type: "uint256" }], name: "getSellQuote", outputs: [{ name: "usdOut", type: "uint256" }, { name: "phase", type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "usdIn", type: "uint256" }, { name: "minTokenOut", type: "uint256" }], name: "buy", outputs: [{ name: "tokenOut", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "tokenIn", type: "uint256" }, { name: "minUSDOut", type: "uint256" }], name: "sell", outputs: [{ name: "usdOut", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { anonymous: false, inputs: [{ indexed: true, name: "buyer", type: "address" }, { name: "usdIn", type: "uint256" }, { name: "tokenOut", type: "uint256" }, { name: "phase", type: "uint8" }], name: "Buy", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "seller", type: "address" }, { name: "tokenIn", type: "uint256" }, { name: "usdOut", type: "uint256" }, { name: "phase", type: "uint8" }], name: "Sell", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "pool", type: "address" }, { name: "tokenAmt", type: "uint256" }, { name: "usdAmt", type: "uint256" }], name: "Graduated", type: "event" },
] as const;

export const POOL_ABI = [
  { inputs: [], name: "getPrice", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "tokenReserve", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "usdReserve", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "graduated", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalLP", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "creator", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "graduationTime", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "lastSwapTime", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "isClaimable", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "isRedeemPeriodEnded", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "timeUntilClaimable", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "", type: "address" }], name: "lpBalance", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "usdIn", type: "uint256" }], name: "getBuyQuote", outputs: [{ name: "tokenOut", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "tokenIn", type: "uint256" }], name: "getSellQuote", outputs: [{ name: "usdOut", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "tokenIn", type: "uint256" }], name: "getRedeemQuote", outputs: [{ name: "usdOut", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "usdIn", type: "uint256" }, { name: "minTokenOut", type: "uint256" }], name: "buyToken", outputs: [{ name: "tokenOut", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "tokenIn", type: "uint256" }, { name: "minUSDOut", type: "uint256" }], name: "sellToken", outputs: [{ name: "usdOut", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "tokenIn", type: "uint256" }, { name: "minUsdOut", type: "uint256" }], name: "redeemTokenForUSD", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "recoverToTreasury", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "usdIn", type: "uint256" }, { name: "minLP", type: "uint256" }], name: "addLiquidity", outputs: [{ name: "lp", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { anonymous: false, inputs: [{ indexed: true, name: "user", type: "address" }, { name: "tokenIn", type: "uint256" }, { name: "usdOut", type: "uint256" }], name: "Redeemed", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "user", type: "address" }, { name: "buyToken", type: "bool" }, { name: "amountIn", type: "uint256" }, { name: "amountOut", type: "uint256" }], name: "Swap", type: "event" },
] as const;

export const ERC20_ABI = [
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "name", outputs: [{ name: "", type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "symbol", outputs: [{ name: "", type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "imageURI", outputs: [{ name: "", type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "description", outputs: [{ name: "", type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "creator", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalSupply", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "saleContract", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
] as const;

export const fmtPrice = (raw: bigint): string => {
  const usdPerToken = Number(raw) / 1e6;
  if (usdPerToken === 0) return "$0.00";
  if (usdPerToken < 0.0001) return "$" + usdPerToken.toFixed(8).replace(/\.?0+$/, "");
  if (usdPerToken < 1) return "$" + usdPerToken.toFixed(6).replace(/\.?0+$/, "");
  return "$" + usdPerToken.toFixed(2);
};
  return "$" + usdPerToken.toFixed(2);
};

export const fmtMcap = (raw: bigint): string => {
  const usd = Number(raw) / 1e6;
  if (usd >= 1_000_000_000) return "$" + (usd / 1_000_000_000).toFixed(2) + "B";
  if (usd >= 1_000_000) return "$" + (usd / 1_000_000).toFixed(2) + "M";
  if (usd >= 1_000) return "$" + (usd / 1_000).toFixed(2) + "k";
  return "$" + usd.toFixed(2);
};

export const fmtTokens = (raw: bigint): string => {
  const n = Number(raw) / 1e18;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(2) + "k";
  return n.toFixed(2);
};

export const fmtPhase1Progress = (sold: bigint): number => {
  const PHASE1 = 100_000_000n * 10n**18n;
  return Math.min(100, Number(sold * 100n / PHASE1));
};

export const MEME_TOKEN_BYTECODE = "0x608060405234801561000f575f5ffd5b50604051610ae9380380610ae983398101604081905261002e916101ae565b5f610039878261030c565b506001610046868261030c565b506002610053858261030c565b506003610060848261030c565b50600480546001600160a01b038085166001600160a01b0319928316179092556005805492841692909116821790556b033b2e3c9fd0803ce800000060068190555f828152600760205260408082208390555190917fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef916100e391815260200190565b60405180910390a35050505050506103c6565b634e487b7160e01b5f52604160045260245ffd5b5f82601f830112610119575f5ffd5b81516001600160401b03811115610132576101326100f6565b604051601f8201601f19908116603f011681016001600160401b0381118282101715610160576101606100f6565b604052818152838201602001851015610177575f5ffd5b8160208501602083015e5f918101602001919091529392505050565b80516001600160a01b03811681146101a9575f5ffd5b919050565b5f5f5f5f5f5f60c087890312156101c3575f5ffd5b86516001600160401b038111156101d8575f5ffd5b6101e489828a0161010a565b602089015190975090506001600160401b03811115610201575f5ffd5b61020d89828a0161010a565b604089015190965090506001600160401b0381111561022a575f5ffd5b61023689828a0161010a565b606089015190955090506001600160401b03811115610253575f5ffd5b61025f89828a0161010a565b93505061026e60808801610193565b915061027c60a08801610193565b90509295509295509295565b600181811c9082168061029c57607f821691505b6020821081036102ba57634e487b7160e01b5f52602260045260245ffd5b50919050565b601f82111561030757805f5260205f20601f840160051c810160208510156102e55750805b601f840160051c820191505b81811015610304575f81556001016102f1565b50505b505050565b81516001600160401b03811115610325576103256100f6565b610339816103338454610288565b846102c0565b6020601f82116001811461036b575f83156103545750848201515b5f19600385901b1c1916600184901b178455610304565b5f84815260208120601f198516915b8281101561039a578785015182556020948501946001909201910161037a565b50848210156103b757868401515f19600387901b60f8161c191681555b50505050600190811b01905550565b610716806103d35f395ff3fe608060405234801561000f575f5ffd5b50600436106100e5575f3560e01c806370a082311161008857806395d89b411161006357806395d89b41146101d7578063a9059cbb146101df578063daf6ca30146101f2578063dd62ed3e14610205575f5ffd5b806370a082311461019d5780637284e416146101bc578063902d55a5146101c4575f5ffd5b8063135d088d116100c3578063135d088d1461015157806318160ddd1461015957806323b872dd14610170578063313ce56714610183575f5ffd5b806302d05d3f146100e957806306fdde0314610119578063095ea7b31461012e575b5f5ffd5b6004546100fc906001600160a01b031681565b6040516001600160a01b0390911681526020015b60405180910390f35b61012161022f565b604051610110919061056b565b61014161013c3660046105bb565b6102ba565b6040519015158152602001610110565b610121610326565b61016260065481565b604051908152602001610110565b61014161017e3660046105e3565b610333565b61018b601281565b60405160ff9091168152602001610110565b6101626101ab36600461061d565b60076020525f908152604090205481565b610121610496565b6101626b033b2e3c9fd0803ce800000081565b6101216104a3565b6101416101ed3660046105bb565b6104b0565b6005546100fc906001600160a01b031681565b61016261021336600461063d565b600860209081525f928352604080842090915290825290205481565b5f805461023b9061066e565b80601f01602080910402602001604051908101604052809291908181526020018280546102679061066e565b80156102b25780601f10610289576101008083540402835291602001916102b2565b820191905f5260205f20905b81548152906001019060200180831161029557829003601f168201915b505050505081565b335f8181526008602090815260408083206001600160a01b038716808552925280832085905551919290917f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925906103149086815260200190565b60405180910390a35060015b92915050565b6002805461023b9061066e565b6001600160a01b0383165f9081526007602052604081205482111561036b57604051631e9acf1760e31b815260040160405180910390fd5b6001600160a01b0384165f9081526008602090815260408083203384529091529020548211156103ae576040516313be252b60e01b815260040160405180910390fd5b6001600160a01b0384165f908152600860209081526040808320338452909152812080548492906103e09084906106ba565b90915550506001600160a01b0384165f908152600760205260408120805484929061040c9084906106ba565b90915550506001600160a01b0383165f90815260076020526040812080548492906104389084906106cd565b92505081905550826001600160a01b0316846001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8460405161048491815260200190565b60405180910390a35060019392505050565b6003805461023b9061066e565b6001805461023b9061066e565b335f908152600760205260408120548211156104df57604051631e9acf1760e31b815260040160405180910390fd5b335f90815260076020526040812080548492906104fd9084906106ba565b90915550506001600160a01b0383165f90815260076020526040812080548492906105299084906106cd565b90915550506040518281526001600160a01b0384169033907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef90602001610314565b602081525f82518060208401528060208501604085015e5f604082850101526040601f19601f83011684010191505092915050565b80356001600160a01b03811681146105b6575f5ffd5b919050565b5f5f604083850312156105cc575f5ffd5b6105d5836105a0565b946020939093013593505050565b5f5f5f606084860312156105f5575f5ffd5b6105fe846105a0565b925061060c602085016105a0565b929592945050506040919091013590565b5f6020828403121561062d575f5ffd5b610636826105a0565b9392505050565b5f5f6040838503121561064e575f5ffd5b610657836105a0565b9150610665602084016105a0565b90509250929050565b600181811c9082168061068257607f821691505b6020821081036106a057634e487b7160e01b5f52602260045260245ffd5b50919050565b634e487b7160e01b5f52601160045260245ffd5b81810381811115610320576103206106a6565b80820180821115610320576103206106a656fea2646970667358221220403bab3f9ab1d8d2affb95bdecc476f43130f25953c7480cc54630e101ab334c64736f6c634300081c0033";
