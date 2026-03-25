import { Link, useNavigate } from "react-router-dom";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { Rocket, Plus, User, Zap } from "lucide-react";

export default function Navbar() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const navigate = useNavigate();

  const short = (addr: string) => addr.slice(0, 6) + "..." + addr.slice(-4);

  return (
    <nav style={{ backgroundColor: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 50, padding: "0 16px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        
        {/* Logo */}
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
          <Zap size={22} color="var(--accent)" fill="var(--accent)" />
          <span style={{ fontWeight: 700, fontSize: "18px", color: "var(--text-primary)" }}>cafe.fun</span>
          <span style={{ fontSize: "11px", color: "var(--accent)", background: "#14532d33", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>TESTNET</span>
        </Link>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Link to="/" style={{ color: "var(--text-secondary)", textDecoration: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Rocket size={15} /> <span>Feed</span>
          </Link>

          <Link to="/create" style={{ backgroundColor: "var(--accent)", color: "#000", textDecoration: "none", padding: "7px 14px", borderRadius: "6px", fontSize: "14px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
            <Plus size={15} /> <span>Launch Token</span>
          </Link>

          {isConnected && address ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button onClick={() => navigate(`/profile/${address}`)} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", padding: "7px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                <User size={14} /> {short(address)}
              </button>
              <button onClick={() => disconnect()} style={{ backgroundColor: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", padding: "7px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>
                Disconnect
              </button>
            </div>
          ) : (
            <button onClick={() => connect({ connector: injected() })} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--accent)", color: "var(--accent)", padding: "7px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>
            Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
