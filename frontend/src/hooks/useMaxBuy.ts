import { usePublicClient } from "wagmi";
import { SALE_ABI } from "../config/contracts";
import { useState, useEffect } from "react";

// Helper: tinh max USD co the mua truoc khi het CURVE_SUPPLY
export function useMaxBuy(curveAddr: `0x${string}` | undefined) {
  const pub = usePublicClient();
  const [maxBuy, setMaxBuy] = useState<bigint>(0n);

  useEffect(() => {
    if (!pub || !curveAddr) return;
    // CURVE_SUPPLY = 666_534_854e18, thu binary search don gian
    // thay vao do, chi can check getBuyAmount voi so lon
    async function calc() {
      try {
        // Thu mua $68,999 (gan graduation)
        const test = await pub!.readContract({
          address: curveAddr!,
          abi: functionName: "getBuyAmount",
          args: [68999n * 1_000_000n],
        });
        setMaxBuy(68999n * 1_000_000n);
      } catch {
        setMaxBuy(1000n * 1_000_000n); // fallback $1000
      }
    }
    calc();
  }, [pub, curveAddr]);

  return maxBuy;
}
