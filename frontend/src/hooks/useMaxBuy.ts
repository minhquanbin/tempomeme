import { usePublicClient } from "wagmi";
import { SALE_ABI } from "../config/contracts";
import { useState, useEffect } from "react";

export function useMaxBuy(saleAddr: `0x${string}` | undefined) {
  const pub = usePublicClient();
  const [maxBuy, setMaxBuy] = useState<bigint>(0n);

  useEffect(() => {
    if (!pub || !saleAddr) return;
    async function calc() {
      try {
        await pub!.readContract({
          address: saleAddr!,
          abi: SALE_ABI,
          functionName: "getBuyQuote",
          args: [68999n * 1_000_000n],
        });
        setMaxBuy(68999n * 1_000_000n);
      } catch {
        setMaxBuy(1000n * 1_000_000n);
      }
    }
    calc();
  }, [pub, saleAddr]);

  return maxBuy;
}