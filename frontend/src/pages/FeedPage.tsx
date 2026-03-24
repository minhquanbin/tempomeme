import { usePublicClient } from "wagmi";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FACTORY_ADDRESS, FACTORY_ABI, SALE_ABI, ERC20_ABI } from "../config/contracts";
import { Rocket, TrendingUp, Clock, Zap } from "lucide-react";

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  imageURI: string;
  description: string;
  creator: string;
  saleAddress: string;
  price: bigint;
  marketCap: bigint;
  phase: number;
  phase1Sold: bigint;
}

function TokenCard({ token, onClick }: { token: TokenInfo; onClick: () => void }) {
  const fmtPrice = (p: bigint) => { const n = Number(p) / 1e18; return n < 0.000001 ? n.toExponential(2) : n.toFixed(8); };
  const fmtMcap  = (m: bigint) => { const n = Number(m) / 1e6; return n >= 1000 ? "$" + (n/1000).toFixed(1) + "k" : "$" + n.toFixed(2); };
  const short = (a: string) => a.slice(0,6) + "..." + a.slice(-4);
  const PHASE1 = 100_000_000n * 10n**18n;
  const progress = token.phase === 1 ? Math.min(100, Number(token.phase1Sold * 100n / PHASE1)) : 100;

  return (
    <div onClick={onClick} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", cursor: "pointer", transition: "border-color 0.2s", display: "flex", flexDirection: "column", gap: "12px" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")} onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <img src={token.imageURI} alt={token.name} onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/64x64/1a1a1a/22c55e?text=" + token.symbol[0]; }} style={{ width: "56px", height: "56px", borderRadius: "10px", objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>{token.name}</span>
            <span style={{ fontSize: "11px", color: "var(--accent)", background: "#14532d33", padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>{token.symbol}</span>
            <span style={{ fontSize: "10px", color: token.phase === 1 ? "#f59e0b" : "#22c55e", background: token.phase === 1 ? "#f59e0b22" : "#22c55e22", padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>Phase {token.phase}</span>
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{token.description || "No description"}</p>
          <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>by {short(token.creator)}</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div style={{ background: "var(--bg-secondary)", borderRadius: "8px", padding: "8px" }}>
          <p style={{ fontSize: "10px", color: "var(--text-secondary)", marginBottom: "2px" }}>Price</p>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>${fmtPrice(token.price)}</p>
        </div>
        <div style={{ background: "var(--bg-secondary)", borderRadius: "8px", padding: "8px" }}>
          <p style={{ fontSize: "10px", color: "var(--text-secondary)", marginBottom: "2px" }}>Market Cap</p>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent)" }}>{fmtMcap(token.marketCap)}</p>
        </div>
      </div>
      {token.phase === 1 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Phase 1 Progress</span>
            <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 600 }}>{progress}%</span>
          </div>
          <div style={{ height: "4px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: progress + "%", background: "linear-gradient(90deg, #f59e0b, #fcd34d)", borderRadius: "2px", transition: "width 0.3s" }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function FeedPage() {
  const pub = usePublicClient();
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { loadTokens(); }, []);

  async function loadTokens() {
    if (!pub) return;
    setLoading(true);
    try {
      const addrs = await pub.readContract({ address: FACTORY_ADDRESS, abi: FACTORY_ABI, functionName: "getAllTokens" }) as string[];
      if (addrs.length === 0) { setLoading(false); return; }
      const results = await Promise.all(addrs.map(async (addr) => {
        try {
          const a = addr as `0x${string}`;
          const [name, symbol, imageURI, description, creator, saleAddress] = await Promise.all([
            pub.readContract({ address: a, abi: ERC20_ABI, functionName: "name" }),
            pub.readContract({ address: a, abi: ERC20_ABI, functionName: "symbol" }),
            pub.readContract({ address: a, abi: ERC20_ABI, functionName: "imageURI" }),
            pub.readContract({ address: a, abi: ERC20_ABI, functionName: "description" }),
            pub.readContract({ address: a, abi: ERC20_ABI, functionName: "creator" }),
            pub.readContract({ address: FACTORY_ADDRESS, abi: FACTORY_ABI, functionName: "tokenToSale", args: [a] }),
          ]);
          const sa = saleAddress as `0x${string}`;
          const [price, marketCap, phase, phase1Sold] = await Promise.all([
            pub.readContract({ address: sa, abi: SALE_ABI, functionName: "getCurrentPrice" }),
            pub.readContract({ address: sa, abi: SALE_ABI, functionName: "getMarketCap" }),
            pub.readContract({ address: sa, abi: SALE_ABI, functionName: "currentPhase" }),
            pub.readContract({ address: sa, abi: SALE_ABI, functionName: "phase1Sold" }),
          ]);
          return { address: addr, name, symbol, imageURI, description, creator, saleAddress, price, marketCap, phase, phase1Sold } as TokenInfo;
        } catch { return null; }
      }));
      setTokens(results.filter(Boolean).reverse() as TokenInfo[]);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const filtered = tokens.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.symbol.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ paddingTop: "32px", paddingBottom: "48px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
            <TrendingUp size={24} color="var(--accent)" /> Meme Tokens
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>Discover and trade meme tokens on Tempo</p>
        </div>
        <button onClick={loadTokens} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
          <Zap size={14} /> Refresh
        </button>
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tokens..." style={{ width: "100%", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 16px", color: "var(--text-primary)", fontSize: "14px", marginBottom: "24px", outline: "none" }} />
      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-secondary)" }}>
          <Rocket size={40} style={{ margin: "0 auto 16px", opacity: 0.4 }} />
          <p>Loading...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-secondary)" }}>
          <Rocket size={40} style={{ margin: "0 auto 16px", opacity: 0.4 }} />
          <p style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)" }}>No tokens yet</p>
          <p style={{ marginTop: "8px", fontSize: "14px" }}>Be the first to launch a token!</p>
          <button onClick={() => navigate("/create")} style={{ marginTop: "20px", background: "var(--accent)", color: "#000", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "14px" }}>Launch now</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
          {filtered.map(t => <TokenCard key={t.address} token={t} onClick={() => navigate("/token/" + t.address)} />)}
        </div>
      )}
    </div>
  );
}

