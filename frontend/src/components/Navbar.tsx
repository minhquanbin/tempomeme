import { Link, useNavigate } from "react-router-dom";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { Rocket, Plus, User, Zap, AlertTriangle } from "lucide-react";

const TEMPO_CHAIN_ID = 42431;
const TEMPO_CHAIN = {
  chainId: "0xA5FF",
  chainName: "Tempo Moderato",
  nativeCurrency: { name: "USD", symbol: "USD", decimals: 18 },
  rpcUrls: ["https://rpc.moderato.tempo.xyz"],
  blockExplorerUrls: ["https://explore.moderato.tempo.xyz"],
};

export default function Navbar() {
  const { address, isConnected, chainId } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const navigate = useNavigate();
  const short = (addr: string) => addr.slice(0, 6) + "..." + addr.slice(-4);
  const wrongNetwork = isConnected && chainId !== TEMPO_CHAIN_ID;

  async function addTempoNetwork() {
    try {
      await switchChainAsync({ chainId: TEMPO_CHAIN_ID });
    } catch {
      try {
        await (window as any).ethereum.request({
          method: "wallet_addEthereumChain",
          params: [TEMPO_CHAIN],
        });
      } catch (e: any) {
        console.error("Failed to add network:", e);
      }
    }
  }

  return (
    <>
      <nav style={{ backgroundColor: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 50, padding: "0 16px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
            <Zap size={22} color="var(--accent)" fill="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: "18px", color: "var(--text-primary)" }}>cafe.fun</span>
            <span style={{ fontSize: "11px", color: "var(--accent)", background: "#14532d33", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>TESTNET</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Link to="/" style={{ color: "var(--text-secondary)", textDecoration: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Rocket size={15} /> <span>Feed</span>
            </Link>
            <Link to="/create" style={{ backgroundColor: "var(--accent)", color: "#000", textDecoration: "none", padding: "7px 14px", borderRadius: "6px", fontSize: "14px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
              <Plus size={15} /> <span>Launch Token</span>
            </Link>
            {wrongNetwork && (
              <button onClick={addTempoNetwork} style={{ backgroundColor: "#f59e0b", color: "#000", border: "none", padding: "7px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", animation: "pulse 2s infinite" }}>
                <AlertTriangle size={14} /> Wrong Network
              </button>
            )}
            {isConnected && address ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button onClick={() => navigate("/profile/" + address)} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", padding: "7px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <User size={14} /> {short(address)}
                </button>
                <button onClick={() => disconnect()} style={{ backgroundColor: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", padding: "7px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>Disconnect</button>
              </div>
            ) : (
              <button onClick={() => connect({ connector: injected() })} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--accent)", color: "var(--accent)", padding: "7px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>Connect Wallet</button>
            )}
          </div>
        </div>
      </nav>
      {wrongNetwork && (
        <div style={{ background: "#f59e0b", color: "#000", textAlign: "center", padding: "8px 16px", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
          <AlertTriangle size={14} />
          You are on the wrong network. cafe.fun runs on Tempo Moderato (Chain ID 42431).
          <button onClick={addTempoNetwork} style={{ background: "#000", color: "#f59e0b", border: "none", padding: "4px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}>
            Switch Network
          </button>
        </div>
      )}
    </>
  );
}