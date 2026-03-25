import { usePublicClient } from "wagmi";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FACTORY_ADDRESS, FACTORY_ABI, SALE_ABI, ERC20_ABI, POOL_ABI } from "../config/contracts";
import { Rocket, TrendingUp, Zap, Flame, Star, BarChart2 } from "lucide-react";

interface TokenInfo {
  address: string; name: string; symbol: string; imageURI: string;
  description: string; creator: string; saleAddress: string; poolAddress: string;
  price: bigint; marketCap: bigint; phase: number; phase1Sold: bigint;
  usdReserve: bigint; poolUsdReserve: bigint; tokenReserve: bigint;
}

const GRADUATION_TARGET = 69_000_000_000n;
const PHASE1 = 100_000_000n * 10n**18n;

const fmtPrice = (p: bigint) => {
  const n = Number(p) / 1e6;
  if (n === 0) return "$0.00";
  if (n < 0.0001) return "$" + n.toFixed(8).replace(/\.?0+$/, "");
  return "$" + n.toFixed(6).replace(/\.?0+$/, "");
};
const fmtUsd = (v: bigint) => {
  const n = Number(v) / 1e6;
  return n >= 1_000_000 ? "$" + (n/1_000_000).toFixed(2) + "M" : n >= 1000 ? "$" + (n/1000).toFixed(1) + "k" : "$" + n.toFixed(2);
};
const short = (a: string) => a.slice(0,6) + "..." + a.slice(-4);

function GradProgress({ usdReserve }: { usdReserve: bigint }) {
  const pct = Math.min(100, Number(usdReserve * 100n / GRADUATION_TARGET));
  const color = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#22c55e";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Graduation Progress</span>
        <span style={{ fontSize: "11px", color, fontWeight: 700 }}>{pct.toFixed(1)}%</span>
      </div>
      <div style={{ height: "4px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", background: "linear-gradient(90deg," + color + "," + color + "88)", borderRadius: "2px", transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

function LaunchCard({ token, onClick, highlight }: { token: TokenInfo; onClick: () => void; highlight?: boolean }) {
  const progress = token.phase === 1 ? Math.min(100, Number(token.phase1Sold * 100n / PHASE1)) : 100;
  const bN = "var(--border)", bHL = "#ef444466", bHLH = "#ef4444", bH = "var(--accent)";
  return (
    <div onClick={onClick}
      style={{ backgroundColor: "var(--bg-card)", border: "1px solid " + (highlight ? bHL : bN), borderRadius: "12px", padding: "16px", cursor: "pointer", transition: "border-color 0.2s", display: "flex", flexDirection: "column", gap: "12px", position: "relative", height: "100%", boxSizing: "border-box" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = highlight ? bHLH : bH)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = highlight ? bHL : bN)}>
      {highlight && (
        <div style={{ position: "absolute", top: "-10px", left: "12px", background: "linear-gradient(90deg, #ef4444, #f59e0b)", color: "#fff", fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "4px" }}>
          <Flame size={10} /> GRADUATING SOON
        </div>
      )}
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <img src={token.imageURI} alt={token.name} onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/64x64/1a1a1a/22c55e?text=" + token.symbol[0]; }} style={{ width: "56px", height: "56px", borderRadius: "10px", objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "120px", display: "inline-block", verticalAlign: "middle" }}>{token.name}</span>
            <span style={{ fontSize: "11px", color: "var(--accent)", background: "#14532d33", padding: "1px 6px", borderRadius: "4px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80px", display: "inline-block", verticalAlign: "middle" }}>{token.symbol}</span>
            <span style={{ fontSize: "10px", color: token.phase === 1 ? "#f59e0b" : "#22c55e", background: token.phase === 1 ? "#f59e0b22" : "#22c55e22", padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>Phase {token.phase}</span>
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{token.description || "No description"}</p>
          <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>by {short(token.creator)}</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div style={{ background: "var(--bg-secondary)", borderRadius: "8px", padding: "8px" }}>
          <p style={{ fontSize: "10px", color: "var(--text-secondary)", marginBottom: "2px" }}>Price</p>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{fmtPrice(token.price)}</p>
        </div>
        <div style={{ background: "var(--bg-secondary)", borderRadius: "8px", padding: "8px" }}>
          <p style={{ fontSize: "10px", color: "var(--text-secondary)", marginBottom: "2px" }}>Market Cap</p>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent)" }}>{fmtUsd(token.marketCap)}</p>
        </div>
      </div>
      {token.phase === 1 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Phase 1 Progress</span>
            <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 600 }}>{progress}%</span>
          </div>
          <div style={{ height: "4px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: progress + "%", background: "linear-gradient(90deg, #f59e0b, #fcd34d)", borderRadius: "2px" }} />
          </div>
        </div>
      )}
      {token.phase === 2 && <GradProgress usdReserve={token.usdReserve} />}
    </div>
  );
}

function TradeCard({ token, onClick }: { token: TokenInfo; onClick: () => void }) {
  const poolPrice = token.tokenReserve > 0n ? token.poolUsdReserve * 10n**18n / token.tokenReserve : 0n;
  return (
    <div onClick={onClick}
      style={{ backgroundColor: "var(--bg-card)", border: "1px solid #a855f733", borderRadius: "12px", padding: "16px", cursor: "pointer", transition: "border-color 0.2s", display: "flex", flexDirection: "column", gap: "12px" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#a855f7")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#a855f733")}>
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <img src={token.imageURI} alt={token.name} onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/64x64/1a1a1a/a855f7?text=" + token.symbol[0]; }} style={{ width: "56px", height: "56px", borderRadius: "10px", objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "120px", display: "inline-block", verticalAlign: "middle" }}>{token.name}</span>
            <span style={{ fontSize: "11px", color: "#a855f7", background: "#a855f722", padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>{token.symbol}</span>
            <span style={{ fontSize: "10px", color: "#a855f7", background: "#a855f722", padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>DEX</span>
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{token.description || "No description"}</p>
          <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>by {short(token.creator)}</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div style={{ background: "var(--bg-secondary)", borderRadius: "8px", padding: "8px" }}>
          <p style={{ fontSize: "10px", color: "var(--text-secondary)", marginBottom: "2px" }}>Price</p>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{fmtPrice(poolPrice)}</p>
        </div>
        <div style={{ background: "var(--bg-secondary)", borderRadius: "8px", padding: "8px" }}>
          <p style={{ fontSize: "10px", color: "var(--text-secondary)", marginBottom: "2px" }}>Liquidity</p>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#a855f7" }}>{fmtUsd(token.poolUsdReserve)}</p>
        </div>
      </div>
    </div>
  );
}

let tokenCache: TokenInfo[] = [];
let cacheTime = 0;
const CACHE_TTL = 30_000;

export default function FeedPage() {
  const pub = usePublicClient();
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<TokenInfo[]>(tokenCache);
  const [loading, setLoading] = useState(tokenCache.length === 0);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"launch" | "trade">("launch");

  useEffect(() => { if (pub) loadTokens(); }, [pub]);

  async function loadTokens() {
    if (!pub) return;
    const now = Date.now();
    if (tokenCache.length > 0 && now - cacheTime < CACHE_TTL) return;
    setLoading(tokenCache.length === 0);
    try {
      const addrs = await pub.readContract({ address: FACTORY_ADDRESS, abi: FACTORY_ABI, functionName: "getAllTokens" }) as `0x${string}`[];
      if (addrs.length === 0) { setLoading(false); return; }

      const saleCalls = addrs.map(a => ({ address: FACTORY_ADDRESS, abi: FACTORY_ABI, functionName: "tokenToSale", args: [a] } as const));
      let saleResults: any[];
      try { saleResults = await pub.multicall({ contracts: saleCalls, allowFailure: false }); }
      catch { saleResults = await Promise.all(saleCalls.map(c => pub.readContract(c).catch(() => null))); }
      const saleAddrs = saleResults as `0x${string}`[];

      const poolCalls = addrs.map(a => ({ address: FACTORY_ADDRESS, abi: FACTORY_ABI, functionName: "tokenToPool", args: [a] } as const));
      let poolResults: any[];
      try { poolResults = await pub.multicall({ contracts: poolCalls, allowFailure: true }); }
      catch { poolResults = addrs.map(() => ({ status: "failure", result: null })); }
      const poolAddrs = poolResults.map((r: any) => r?.status === "success" ? r.result : null) as (`0x${string}` | null)[];

      const ZERO = "0x0000000000000000000000000000000000000000" as `0x${string}`;
      const calls: any[] = [];
      addrs.forEach((addr, i) => {
        const sa = saleAddrs[i];
        const pa = (poolAddrs[i] && poolAddrs[i] !== ZERO) ? poolAddrs[i] as `0x${string}` : sa;
        calls.push(
          { address: addr, abi: ERC20_ABI, functionName: "name" },
          { address: addr, abi: ERC20_ABI, functionName: "symbol" },
          { address: addr, abi: ERC20_ABI, functionName: "imageURI" },
          { address: addr, abi: ERC20_ABI, functionName: "description" },
          { address: addr, abi: ERC20_ABI, functionName: "creator" },
          { address: sa,   abi: SALE_ABI,  functionName: "getCurrentPrice" },
          { address: sa,   abi: SALE_ABI,  functionName: "getMarketCap" },
          { address: sa,   abi: SALE_ABI,  functionName: "currentPhase" },
          { address: sa,   abi: SALE_ABI,  functionName: "phase1Sold" },
          { address: sa,   abi: SALE_ABI,  functionName: "usdReserve" },
          { address: pa,   abi: POOL_ABI,  functionName: "usdReserve" },
          { address: pa,   abi: POOL_ABI,  functionName: "tokenReserve" },
        );
      });

      let results: any[];
      try { results = await pub.multicall({ contracts: calls, allowFailure: true }); }
      catch {
        results = [];
        for (let i = 0; i < calls.length; i++) {
          try { results.push({ status: "success", result: await pub.readContract(calls[i]) }); }
          catch { results.push({ status: "failure", result: null }); }
          if (i % 5 === 4) await new Promise(r => setTimeout(r, 500));
        }
      }

      const list: TokenInfo[] = [];
      addrs.forEach((addr, i) => {
        const base = i * 12;
        const get = (j: number) => results[base + j]?.status === "success" ? results[base + j].result : null;
        const name = get(0) as string;
        const symbol = get(1) as string;
        if (!name || !symbol) return;
        const phase = (get(7) as number) ?? 1;
        const poolUsdReserve = (get(10) as bigint) ?? 0n;
        if (phase === 3 && poolUsdReserve === 0n) return;
        const ZERO = "0x0000000000000000000000000000000000000000";
        const pa = (poolAddrs[i] && poolAddrs[i] !== ZERO) ? poolAddrs[i] as string : "";
        list.push({
          address: addr, name, symbol,
          imageURI:      (get(2) as string) ?? "",
          description:   (get(3) as string) ?? "",
          creator:       (get(4) as string) ?? "",
          saleAddress:   saleAddrs[i],
          poolAddress:   pa,
          price:         (get(5) as bigint) ?? 0n,
          marketCap:     (get(6) as bigint) ?? 0n,
          phase,
          phase1Sold:    (get(8) as bigint) ?? 0n,
          usdReserve:    (get(9) as bigint) ?? 0n,
          poolUsdReserve,
          tokenReserve:  (get(11) as bigint) ?? 0n,
        });
      });

      const sorted = list.reverse();
      tokenCache = sorted;
      cacheTime = Date.now();
      setTokens(sorted);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const filtered = tokens.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.symbol.toLowerCase().includes(search.toLowerCase())
  );

  const launchTokens = filtered.filter(t => t.phase !== 3);
  const tradeTokens  = filtered.filter(t => t.phase === 3).sort((a, b) => (b.poolUsdReserve > a.poolUsdReserve ? 1 : -1));

  const hotTokens = [...launchTokens].sort((a, b) => (b.marketCap > a.marketCap ? 1 : b.marketCap < a.marketCap ? -1 : 0)).slice(0, 3);
  const hotAddrs = new Set(hotTokens.map(t => t.address));
  const rest = launchTokens.filter(t => !hotAddrs.has(t.address));
  const newListings = rest.slice(0, 3);
  const remaining = rest.slice(3).sort((a, b) => (b.marketCap > a.marketCap ? 1 : b.marketCap < a.marketCap ? -1 : 0));

  const tabStyle = (active: boolean, color = "var(--accent)") => ({
    padding: "10px 24px", border: "none", borderRadius: "8px", cursor: "pointer",
    fontWeight: 700, fontSize: "14px", transition: "all 0.2s",
    background: active ? color : "var(--bg-card)",
    color: active ? "#000" : "var(--text-secondary)",
    borderBottom: active ? "2px solid " + color : "2px solid transparent",
  });

  return (
    <div style={{ paddingTop: "24px", paddingBottom: "48px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "8px", background: "var(--bg-secondary)", padding: "4px", borderRadius: "10px" }}>
          <button style={tabStyle(tab === "launch")} onClick={() => setTab("launch")}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Rocket size={14} /> Launch</span>
          </button>
          <button style={tabStyle(tab === "trade", "#a855f7")} onClick={() => setTab("trade")}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><BarChart2 size={14} /> Trade {tradeTokens.length > 0 && <span style={{ background: "#a855f733", color: "#a855f7", fontSize: "11px", padding: "0 6px", borderRadius: "10px" }}>{tradeTokens.length}</span>}</span>
          </button>
        </div>
        <button onClick={loadTokens} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
          <Zap size={14} /> Refresh
        </button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tokens..."
        style={{ width: "100%", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 16px", color: "var(--text-primary)", fontSize: "14px", marginBottom: "24px", outline: "none" }} />

      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-secondary)" }}>
          <Rocket size={40} style={{ margin: "0 auto 16px", opacity: 0.4 }} />
          <p>Loading...</p>
        </div>
      ) : tab === "launch" ? (
        launchTokens.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-secondary)" }}>
            <Rocket size={40} style={{ margin: "0 auto 16px", opacity: 0.4 }} />
            <p style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)" }}>No tokens yet</p>
            <p style={{ marginTop: "8px", fontSize: "14px" }}>Be the first to launch a token!</p>
            <button onClick={() => navigate("/create")} style={{ marginTop: "20px", background: "var(--accent)", color: "#000", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "14px" }}>Launch now</button>
          </div>
        ) : (
          <>
            {hotTokens.length > 0 && (
              <div style={{ marginBottom: "32px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                  <Flame size={18} color="#ef4444" />
                  <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#ef4444" }}>Hot</h2>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>— top market cap</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px", alignItems: "stretch", alignItems: "stretch" }}>
                  {hotTokens.map(t => <LaunchCard key={t.address} token={t} onClick={() => navigate("/token/" + t.address)} highlight />)}
                </div>
                <div style={{ height: "1px", background: "var(--border)", margin: "28px 0" }} />
              </div>
            )}
            {newListings.length > 0 && (
              <div style={{ marginBottom: "32px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                  <Star size={16} color="#f59e0b" fill="#f59e0b" />
                  <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#f59e0b" }}>New Listings</h2>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>— just launched</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", alignItems: "stretch", alignItems: "stretch" }}>
                  {newListings.map(t => <LaunchCard key={t.address} token={t} onClick={() => navigate("/token/" + t.address)} />)}
                </div>
                {remaining.length > 0 && <div style={{ height: "1px", background: "var(--border)", margin: "28px 0" }} />}
              </div>
            )}
            {remaining.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                  <TrendingUp size={16} color="var(--text-secondary)" />
                  <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-secondary)" }}>All Tokens</h2>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", alignItems: "stretch", alignItems: "stretch" }}>
                  {remaining.map(t => <LaunchCard key={t.address} token={t} onClick={() => navigate("/token/" + t.address)} />)}
                </div>
              </div>
            )}
          </>
        )
      ) : (
        tradeTokens.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-secondary)" }}>
            <BarChart2 size={40} style={{ margin: "0 auto 16px", opacity: 0.4 }} />
            <p style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)" }}>No DEX pools yet</p>
            <p style={{ marginTop: "8px", fontSize: "14px" }}>Tokens graduate here after raising $69,000</p>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <BarChart2 size={16} color="#a855f7" />
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#a855f7" }}>DEX Pools</h2>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>— sorted by liquidity</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", alignItems: "stretch", alignItems: "stretch" }}>
              {tradeTokens.map(t => <TradeCard key={t.address} token={t} onClick={() => navigate("/token/" + t.address)} />)}
            </div>
          </div>
        )
      )}
    </div>
  );
}