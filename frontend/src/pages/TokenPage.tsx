import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAccount, useConnect, usePublicClient, useWalletClient } from "wagmi";
import { injected } from "wagmi/connectors";
import { FACTORY_ADDRESS, FACTORY_ABI, SALE_ABI, POOL_ABI, ERC20_ABI, PATH_USD } from "../config/contracts";
import { ArrowDownUp, ExternalLink, TrendingUp, Wallet, Rocket } from "lucide-react";
import toast from "react-hot-toast";

export default function TokenPage() {
  const { address: tokenAddr } = useParams<{ address: string }>();
  const { address: userAddr, isConnected } = useAccount();
  const { connect } = useConnect();
  const { data: walletClient } = useWalletClient();
  const pub = usePublicClient();

  const [tab, setTab] = useState<"buy" | "sell" | "redeem">("buy");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<any>(null);
  const [quote, setQuote] = useState<bigint>(0n);
  const [userTokenBal, setUserTokenBal] = useState(0n);
  const [userUSDBal, setUserUSDBal] = useState(0n);

  const ta = tokenAddr as `0x${string}`;

  useEffect(() => { if (pub && ta) loadInfo(); }, [pub, ta]);
  useEffect(() => { if (pub && userAddr && info) loadBalances(); }, [pub, userAddr, info]);
  useEffect(() => { loadQuote(); }, [amount, tab, info]);

  async function loadInfo() {
    if (!pub) return;
    try {
      const saleAddr = await pub.readContract({ address: FACTORY_ADDRESS, abi: FACTORY_ABI, functionName: "tokenToSale", args: [ta] }) as `0x${string}`;
      const poolAddr = await pub.readContract({ address: FACTORY_ADDRESS, abi: FACTORY_ABI, functionName: "tokenToPool", args: [ta] }) as `0x${string}`;

      const [name, symbol, imageURI, description, creator, price, marketCap, phase, phase1Sold, usdReserve, graduated] = await Promise.all([
        pub.readContract({ address: ta, abi: ERC20_ABI, functionName: "name" }),
        pub.readContract({ address: ta, abi: ERC20_ABI, functionName: "symbol" }),
        pub.readContract({ address: ta, abi: ERC20_ABI, functionName: "imageURI" }),
        pub.readContract({ address: ta, abi: ERC20_ABI, functionName: "description" }),
        pub.readContract({ address: ta, abi: ERC20_ABI, functionName: "creator" }),
        pub.readContract({ address: saleAddr, abi: SALE_ABI, functionName: "getCurrentPrice" }),
        pub.readContract({ address: saleAddr, abi: SALE_ABI, functionName: "getMarketCap" }),
        pub.readContract({ address: saleAddr, abi: SALE_ABI, functionName: "currentPhase" }),
        pub.readContract({ address: saleAddr, abi: SALE_ABI, functionName: "phase1Sold" }),
        pub.readContract({ address: saleAddr, abi: SALE_ABI, functionName: "usdReserve" }),
        pub.readContract({ address: saleAddr, abi: SALE_ABI, functionName: "graduated" }),
      ]);

      let poolUsdReserve = 0n, timeUntilClaim = 0n, isClaimable = false, lastSwapTime = 0n, graduationTime = 0n, isRedeemEnded = false;

      if (graduated && poolAddr) {
        try {
          const [pur, tc, ic, lst, gt, ire] = await Promise.all([
            pub.readContract({ address: poolAddr, abi: POOL_ABI, functionName: "usdReserve" }),
            pub.readContract({ address: poolAddr, abi: POOL_ABI, functionName: "timeUntilClaimable" }),
            pub.readContract({ address: poolAddr, abi: POOL_ABI, functionName: "isClaimable" }),
            pub.readContract({ address: poolAddr, abi: POOL_ABI, functionName: "lastSwapTime" }),
            pub.readContract({ address: poolAddr, abi: POOL_ABI, functionName: "graduationTime" }),
            pub.readContract({ address: poolAddr, abi: POOL_ABI, functionName: "isRedeemPeriodEnded" }),
          ]);
          poolUsdReserve = pur as bigint;
          timeUntilClaim = tc as bigint;
          isClaimable = ic as boolean;
          lastSwapTime = lst as bigint;
          graduationTime = gt as bigint;
          isRedeemEnded = ire as boolean;
        } catch {}
      }

      setInfo({ saleAddr, poolAddr, poolUsdReserve, timeUntilClaim, isClaimable, isRedeemEnded, lastSwapTime, graduationTime, name, symbol, imageURI, description, creator, price, marketCap, phase, phase1Sold, usdReserve, graduated });

    } catch (e) { console.error(e); }
  }

  async function loadBalances() {
    if (!pub || !userAddr || !info) return;
    try {
      const [tb, ub] = await Promise.all([
        pub.readContract({ address: ta, abi: ERC20_ABI, functionName: "balanceOf", args: [userAddr] }),
        pub.readContract({ address: PATH_USD, abi: ERC20_ABI, functionName: "balanceOf", args: [userAddr] }),
      ]);
      setUserTokenBal(tb as bigint);
      setUserUSDBal(ub as bigint);
    } catch {}
  }

  async function loadQuote() {
    if (!pub || !info || !amount || isNaN(Number(amount))) { setQuote(0n); return; }
    try {
      if (tab === "redeem") {
        const tokenIn = BigInt(Math.floor(Number(amount) * 1e18));
        const r = await pub.readContract({ address: info.poolAddr, abi: POOL_ABI, functionName: "getRedeemQuote", args: [tokenIn] }) as bigint;
        setQuote(r);
      } else if (tab === "buy") {
        const usdIn = BigInt(Math.floor(Number(amount) * 1e6));
        if (info.phase === 3) {
          const r = await pub.readContract({ address: info.poolAddr, abi: POOL_ABI, functionName: "getBuyQuote", args: [usdIn] }) as bigint;
          setQuote(r);
        } else {
          const r = await pub.readContract({ address: info.saleAddr, abi: SALE_ABI, functionName: "getBuyQuote", args: [usdIn] }) as [bigint, number];
          setQuote(r[0]);
        }
      } else {
        const tokenIn = BigInt(Math.floor(Number(amount) * 1e18));
        if (info.phase === 3) {
          const r = await pub.readContract({ address: info.poolAddr, abi: POOL_ABI, functionName: "getSellQuote", args: [tokenIn] }) as bigint;
          setQuote(r);
        } else {
          const r = await pub.readContract({ address: info.saleAddr, abi: SALE_ABI, functionName: "getSellQuote", args: [tokenIn] }) as [bigint, number];
          setQuote(r[0]);
        }
      }
    } catch { setQuote(0n); }
  }

  async function handleTrade() {
    if (!walletClient || !pub || !info || !amount) return;
    setLoading(true);
    const toastId = toast.loading(tab === "buy" ? "Buying..." : "Selling...");
    try {
      if (tab === "buy") {
        const usdIn = BigInt(Math.floor(Number(amount) * 1e6));
        if (info.phase === 3) {
          const a = await walletClient.writeContract({ address: PATH_USD, abi: ERC20_ABI, functionName: "approve", args: [info.poolAddr, usdIn] });
          await pub.waitForTransactionReceipt({ hash: a });
          const b = await walletClient.writeContract({ address: info.poolAddr, abi: POOL_ABI, functionName: "buyToken", args: [usdIn, 0n] });
          await pub.waitForTransactionReceipt({ hash: b });
        } else {
          const a = await walletClient.writeContract({ address: PATH_USD, abi: ERC20_ABI, functionName: "approve", args: [info.saleAddr, usdIn] });
          await pub.waitForTransactionReceipt({ hash: a });
          const b = await walletClient.writeContract({ address: info.saleAddr, abi: SALE_ABI, functionName: "buy", args: [usdIn, 0n] });
          await pub.waitForTransactionReceipt({ hash: b });
        }
        toast.success("Buy successful!", { id: toastId });
      } else {
        const tokenIn = BigInt(Math.floor(Number(amount) * 1e18));
        if (info.phase === 3) {
          const a = await walletClient.writeContract({ address: ta, abi: ERC20_ABI, functionName: "approve", args: [info.poolAddr, tokenIn] });
          await pub.waitForTransactionReceipt({ hash: a });
          const b = await walletClient.writeContract({ address: info.poolAddr, abi: POOL_ABI, functionName: "sellToken", args: [tokenIn, 0n] });
          await pub.waitForTransactionReceipt({ hash: b });
        } else {
          const a = await walletClient.writeContract({ address: ta, abi: ERC20_ABI, functionName: "approve", args: [info.saleAddr, tokenIn] });
          await pub.waitForTransactionReceipt({ hash: a });
          const b = await walletClient.writeContract({ address: info.saleAddr, abi: SALE_ABI, functionName: "sell", args: [tokenIn, 0n] });
          await pub.waitForTransactionReceipt({ hash: b });
        }
        toast.success("Sell successful!", { id: toastId });
      }
      setAmount(""); setQuote(0n);
      await loadInfo(); await loadBalances();
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("IsGraduated")) { toast.success("Token Graduated! Switching to DEX Pool...", { id: toastId }); await loadInfo(); }
      else if (msg.includes("NoTokensLeft")) toast.error("No tokens left.", { id: toastId });
      else if (msg.includes("SlippageExceeded")) toast.error("Price changed too fast. Try again.", { id: toastId });
      else if (msg.includes("InsufficientReserve")) toast.error("Insufficient reserve.", { id: toastId });
      else toast.error(e?.shortMessage || msg.slice(0, 80) || "Transaction failed", { id: toastId });
    }
    setLoading(false);
  }

  async function handleRedeem() {
    if (!walletClient || !pub || !info || !amount) return;
    setLoading(true);
    const toastId = toast.loading("Redeeming...");
    try {
      const tokenIn = BigInt(Math.floor(Number(amount) * 1e18));
      const q = await pub.readContract({ address: info.poolAddr, abi: POOL_ABI, functionName: "getRedeemQuote", args: [tokenIn] }) as bigint;
      const a = await walletClient.writeContract({ address: ta, abi: ERC20_ABI, functionName: "approve", args: [info.poolAddr, tokenIn] });
      await pub.waitForTransactionReceipt({ hash: a });
      const b = await walletClient.writeContract({ address: info.poolAddr, abi: POOL_ABI, functionName: "redeemTokenForUSD", args: [tokenIn, 0n] });
      await pub.waitForTransactionReceipt({ hash: b });
      toast.success("Redeemed! Received ~$" + (Number(q) / 1e6).toFixed(2), { id: toastId });
      setAmount(""); setQuote(0n);
      await loadInfo(); await loadBalances();
    } catch (e: any) {
      toast.error(e?.shortMessage || "Redeem failed", { id: toastId });
    }
    setLoading(false);
  }

  async function handleRecover() {
    if (!walletClient || !pub || !info) return;
    setLoading(true);
    const toastId = toast.loading("Recovering to treasury...");
    try {
      const hash = await walletClient.writeContract({ address: info.poolAddr as `0x${string}`, abi: POOL_ABI, functionName: "recoverToTreasury" });
      await pub.waitForTransactionReceipt({ hash });
      toast.success("Done! USD sent to treasury.", { id: toastId });
      await loadInfo();
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Error", { id: toastId });
    }
    setLoading(false);
  }

  const PHASE1_SUPPLY = 100_000_000n * 10n ** 18n;
  const GRADUATION_TARGET = 69_000_000_000n;
  const fmtP = (p: bigint) => { const n = Number(p) / 1e6; return n < 0.000001 ? "$" + n.toExponential(3) : "$" + n.toFixed(8); };
  const fmtM = (m: bigint) => { const n = Number(m) / 1e6; if (n >= 1_000_000_000) return "$" + (n / 1_000_000_000).toFixed(2) + "B"; if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M"; if (n >= 1_000) return "$" + (n / 1_000).toFixed(2) + "k"; return "$" + n.toFixed(2); };
  const fmtT = (b: bigint) => (Number(b) / 1e18).toFixed(2);
  const fmtU = (b: bigint) => "$" + (Number(b) / 1e6).toFixed(2);
  const short = (a: string) => a.slice(0, 6) + "..." + a.slice(-4);

  const phase1Progress = info ? Number((info.phase1Sold as bigint) * 10000n / PHASE1_SUPPLY) / 100 : 0;
  const graduationProgress = info && info.phase === 2 ? Math.min(100, Number((info.usdReserve as bigint) * 100n / GRADUATION_TARGET)) : 0;
  const usdRaised = info ? (info.phase === 3 ? Number(info.poolUsdReserve as bigint) / 1e6 : Number(info.usdReserve as bigint) / 1e6) : 0;

  if (!info) return (
    <div style={{ paddingTop: "80px", textAlign: "center", color: "var(--text-secondary)" }}>
      <TrendingUp size={40} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
      <p>Loading...</p>
    </div>
  );

  const inProtection = !info.isClaimable && !info.isRedeemEnded && Number(info.timeUntilClaim as bigint) > 0 && Number(info.graduationTime as bigint) > 0;
  const protectionSecondsLeft = inProtection ? Number(info.timeUntilClaim as bigint) : 0;
  const protectionDaysLeft = Math.max(0, Math.ceil(protectionSecondsLeft / 86400));
  const daysSinceSwap = info.lastSwapTime ? Math.floor((Date.now() / 1000 - Number(info.lastSwapTime as bigint)) / 86400) : 0;
  const daysUntilRedeem = (!info.isClaimable && !info.isRedeemEnded && info.timeUntilClaim) ? Math.ceil(Number(info.timeUntilClaim as bigint) / 86400) : 0;

  const showRedeemTab = info.isClaimable || info.isRedeemEnded;

  return (
    <div style={{ paddingTop: "24px", paddingBottom: "48px", display: "grid", gridTemplateColumns: "1fr 380px", gap: "24px", alignItems: "start" }}>

      {/* Left column */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Token header */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px" }}>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <img
              src={info.imageURI}
              alt={info.name}
              onError={e => { (e.target as any).src = "https://placehold.co/80x80/1a1a1a/22c55e?text=" + info.symbol[0]; }}
              style={{ width: "72px", height: "72px", borderRadius: "14px", objectFit: "cover", border: "1px solid var(--border)" }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>{info.name}</h1>
                <span style={{ fontSize: "12px", color: "var(--accent)", background: "#14532d33", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>{info.symbol}</span>
                {info.phase === 3 ? (
                  <span style={{ fontSize: "11px", color: "#a855f7", background: "#a855f722", padding: "2px 8px", borderRadius: "4px", fontWeight: 600 }}>Graduated</span>
                ) : (
                  <span style={{ fontSize: "11px", color: info.phase === 1 ? "#f59e0b" : "#22c55e", background: info.phase === 1 ? "#f59e0b22" : "#22c55e22", padding: "2px 8px", borderRadius: "4px", fontWeight: 600 }}>Phase {info.phase}</span>
                )}
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "4px" }}>{info.description}</p>
              <p style={{ color: "var(--text-secondary)", fontSize: "12px", marginTop: "6px" }}>
                Creator: <a href={"https://explore.moderato.tempo.xyz/address/" + info.creator} target="_blank" style={{ color: "var(--accent)", textDecoration: "none" }}>{short(info.creator)}</a>
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {([
            ["Price", fmtP(info.price)],
            ["Market Cap", fmtM(info.marketCap)],
            [info.phase === 3 ? "Liquidity" : "USD Raised", "$" + usdRaised.toFixed(2)],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px" }}>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>{label}</p>
              <p style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent)" }}>{val}</p>
            </div>
          ))}
        </div>

        {/* Status panel */}
        {info.phase === 3 ? (
          <div style={{ background: "var(--bg-card)", border: "1px solid #a855f7", borderRadius: "12px", padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <Rocket size={24} color="#a855f7" />
              <div>
                <p style={{ fontSize: "14px", fontWeight: 700, color: "#a855f7" }}>Token Graduated!</p>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>Trading on DEX Pool with permanent liquidity.</p>
              </div>
            </div>

            {info.isRedeemEnded ? (
              <div style={{ padding: "10px 14px", background: "#f59e0b22", border: "1px solid #f59e0b", borderRadius: "8px" }}>
                <p style={{ fontSize: "12px", color: "#f59e0b", fontWeight: 700, marginBottom: "8px" }}>Redeem period ended. USD can be recovered to treasury.</p>
                <button
                  onClick={handleRecover}
                  disabled={loading}
                  style={{ background: "#f59e0b", color: "#000", padding: "8px 20px", borderRadius: "6px", fontWeight: 600, cursor: "pointer", border: "none" }}
                >
                  Recover to Treasury
                </button>
              </div>
            ) : info.isClaimable ? (
              <div style={{ padding: "10px 14px", background: "#22c55e22", border: "1px solid #22c55e", borderRadius: "8px" }}>
                <p style={{ fontSize: "12px", color: "#22c55e", fontWeight: 700 }}>Redeem window open! Burn tokens to receive USD proportionally.</p>
              </div>
            ) : inProtection ? (
              <div style={{ padding: "10px 14px", background: "#a855f722", border: "1px solid #a855f744", borderRadius: "8px" }}>
                <p style={{ fontSize: "12px", color: "#a855f7" }}>Protection period: <strong>{protectionDaysLeft} days</strong> remaining. LP is locked and safe.</p>
              </div>
            ) : daysUntilRedeem > 0 ? (
              <div style={{ padding: "10px 14px", background: "#f59e0b22", border: "1px solid #f59e0b44", borderRadius: "8px" }}>
                <p style={{ fontSize: "12px", color: "#f59e0b" }}>No activity for <strong>{daysSinceSwap} days</strong>. Redeem opens in <strong>{daysUntilRedeem} days</strong> if no swaps occur.</p>
              </div>
            ) : null}
          </div>

        ) : info.phase === 1 ? (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>Phase 1 Progress</span>
              <span style={{ fontSize: "13px", color: "#f59e0b", fontWeight: 700 }}>{phase1Progress.toFixed(1)}%</span>
            </div>
            <div style={{ height: "8px", background: "var(--border)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: phase1Progress + "%", background: "linear-gradient(90deg, #f59e0b, #fcd34d)", borderRadius: "4px" }} />
            </div>
            <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "6px" }}>Phase 1 price: $0.00001/token (fixed)</p>
          </div>

        ) : (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>Graduation Progress ($69,000 target)</span>
              <span style={{ fontSize: "13px", color: "var(--accent)", fontWeight: 700 }}>{graduationProgress.toFixed(1)}%</span>
            </div>
            <div style={{ height: "8px", background: "var(--border)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: graduationProgress + "%", background: "linear-gradient(90deg, var(--accent), #86efac)", borderRadius: "4px" }} />
            </div>
            <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "6px" }}>Reach $69,000 to graduate to permanent DEX Pool</p>
          </div>
        )}

        {/* Links */}
        <div style={{ display: "flex", gap: "8px" }}>
          <a href={"https://explore.moderato.tempo.xyz/address/" + tokenAddr} target="_blank" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-secondary)", textDecoration: "none", background: "var(--bg-card)", border: "1px solid var(--border)", padding: "8px 12px", borderRadius: "8px" }}>
            <ExternalLink size={13} /> Token Contract
          </a>
          <a href={"https://explore.moderato.tempo.xyz/address/" + info.saleAddr} target="_blank" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-secondary)", textDecoration: "none", background: "var(--bg-card)", border: "1px solid var(--border)", padding: "8px 12px", borderRadius: "8px" }}>
            <ExternalLink size={13} /> Sale Contract
          </a>
          {info.phase === 3 && (
            <a href={"https://explore.moderato.tempo.xyz/address/" + info.poolAddr} target="_blank" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#a855f7", textDecoration: "none", background: "#a855f711", border: "1px solid #a855f7", padding: "8px 12px", borderRadius: "8px" }}>
              <ExternalLink size={13} /> DEX Pool
            </a>
          )}
        </div>

      </div>

      {/* Right column — trade panel */}
      <div style={{ background: "var(--bg-card)", border: info.phase === 3 ? "1px solid #a855f7" : "1px solid var(--border)", borderRadius: "16px", padding: "24px", position: "sticky", top: "80px" }}>

        {info.phase === 3 && (
          <div style={{ textAlign: "center", marginBottom: "12px", fontSize: "12px", color: "#a855f7", fontWeight: 600 }}>
            {info.isClaimable ? "REDEEM OPEN — Burn tokens for USD" : "DEX Pool — Permanent Liquidity"}
          </div>
        )}

        {/* Tab selector */}
        <div style={{ display: "grid", gridTemplateColumns: showRedeemTab ? "1fr 1fr 1fr" : "1fr 1fr", marginBottom: "20px", background: "var(--bg-secondary)", borderRadius: "10px", padding: "4px" }}>
          {(["buy", "sell"] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setAmount(""); setQuote(0n); }}
              style={{ padding: "10px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "14px", background: tab === t ? (t === "buy" ? "var(--accent)" : "#ef4444") : "transparent", color: tab === t ? (t === "buy" ? "#000" : "#fff") : "var(--text-secondary)", transition: "all 0.2s" }}
            >
              {t === "buy" ? "Buy" : "Sell"}
            </button>
          ))}
          {showRedeemTab && (
            <button
              onClick={() => { setTab("redeem"); setAmount(""); setQuote(0n); }}
              style={{ padding: "10px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "14px", background: tab === "redeem" ? "#22c55e" : "transparent", color: tab === "redeem" ? "#000" : "#22c55e", transition: "all 0.2s" }}
            >
              Redeem
            </button>
          )}
        </div>

        {/* Balance */}
        {isConnected && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "12px", color: "var(--text-secondary)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Wallet size={12} /> {tab === "buy" ? "USD: " + fmtU(userUSDBal) : info.symbol + ": " + fmtT(userTokenBal)}
            </span>
            <button
              onClick={() => setAmount(tab === "buy" ? (Number(userUSDBal) / 1e6).toFixed(2) : (Number(userTokenBal) / 1e18).toFixed(2))}
              style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontSize: "12px" }}
            >
              MAX
            </button>
          </div>
        )}

        {/* Amount input */}
        <div style={{ marginBottom: "12px" }}>
          <div style={{ position: "relative" }}>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              style={{ width: "100%", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 60px 14px 16px", color: "var(--text-primary)", fontSize: "18px", fontWeight: 700, outline: "none" }}
            />
            <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
              {tab === "buy" ? "USD" : info.symbol}
            </span>
          </div>
        </div>

        {/* Quick amounts for buy */}
        {tab === "buy" && (
          <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
            {["10", "50", "100", "500"].map(v => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                style={{ flex: 1, padding: "6px", background: amount === v ? "var(--accent)" : "var(--bg-secondary)", color: amount === v ? "#000" : "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
              >
                ${v}
              </button>
            ))}
          </div>
        )}

        {/* Quote preview */}
        {quote > 0n && (
          <div style={{ background: "var(--bg-secondary)", borderRadius: "10px", padding: "12px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <ArrowDownUp size={14} color="var(--accent)" />
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              {tab === "buy" ? `Receive ~${fmtT(quote)} ${info.symbol}` : `Receive ~${fmtU(quote)}`}
            </span>
          </div>
        )}

        {/* Action button */}
        {!isConnected ? (
          <button
            onClick={() => connect({ connector: injected() })}
            style={{ width: "100%", background: "var(--accent)", color: "#000", border: "none", padding: "14px", borderRadius: "10px", cursor: "pointer", fontWeight: 700, fontSize: "15px" }}
          >
            Connect Wallet
          </button>
        ) : tab === "redeem" ? (
          info.isRedeemEnded ? (
            <button
              onClick={handleRecover}
              disabled={loading}
              style={{ width: "100%", background: loading ? "var(--border)" : "#f59e0b", color: loading ? "var(--text-secondary)" : "#000", border: "none", padding: "14px", borderRadius: "10px", cursor: loading ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "15px" }}
            >
              {loading ? "Processing..." : "Recover to Treasury"}
            </button>
          ) : (
            <button
              onClick={handleRedeem}
              disabled={loading || !amount}
              style={{ width: "100%", background: loading ? "var(--border)" : "#22c55e", color: loading ? "var(--text-secondary)" : "#000", border: "none", padding: "14px", borderRadius: "10px", cursor: loading || !amount ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "15px" }}
            >
              {loading ? "Processing..." : "Redeem for USD"}
            </button>
          )
        ) : (
          <button
            onClick={handleTrade}
            disabled={loading || !amount}
            style={{ width: "100%", background: loading ? "var(--border)" : tab === "buy" ? "var(--accent)" : "#ef4444", color: loading ? "var(--text-secondary)" : tab === "buy" ? "#000" : "#fff", border: "none", padding: "14px", borderRadius: "10px", cursor: loading || !amount ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "15px" }}
          >
            {loading ? "Processing..." : tab === "buy" ? "Buy" : "Sell"}
          </button>
        )}

        <p style={{ textAlign: "center", fontSize: "11px", color: "var(--text-secondary)", marginTop: "10px" }}>
          {tab === "redeem" ? "Linear redemption — burn tokens, receive USD proportionally" : info.phase === 3 ? "DEX fee: 0.2% platform + 0.3% pool" : "1% trading fee"}
        </p>

      </div>

    </div>
  );
}