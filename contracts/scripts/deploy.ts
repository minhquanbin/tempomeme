import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Deploy bằng Hardhat Ignition (cách đúng cho Hardhat v3)
export default buildModule("MemeFactoryModule", (m) => {
  const PATH_USD = "0x20c0000000000000000000000000000000000000";
  
  // feeRecipient = địa chỉ ví của bạn
  const FEE_RECIPIENT = process.env.DEPLOYER_ADDRESS ?? "0x0000000000000000000000000000000000000000";

  const factory = m.contract("MemeFactory", [PATH_USD, FEE_RECIPIENT]);

  return { factory };
});