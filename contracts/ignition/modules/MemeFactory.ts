import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
const PATH_USD      = "0x20c0000000000000000000000000000000000000";
const FEE_RECIPIENT = process.env.DEPLOYER_ADDRESS ?? "0x0000000000000000000000000000000000000000";
export default buildModule("MemeFactoryModule", (m) => {
  // Deploy LiquidityPool implementation rieng — Factory chi luu address, khong embed bytecode
  const poolImpl = m.contract("LiquidityPool", [PATH_USD, PATH_USD]);
  const factory  = m.contract("MemeFactory", [PATH_USD, FEE_RECIPIENT, poolImpl]);
  return { factory, poolImpl };
});
