import { useState } from "react";
import { useAccount, useConnect, usePublicClient, useWalletClient } from "wagmi";
import { injected } from "wagmi/connectors";
import { useNavigate } from "react-router-dom";
import { FACTORY_ADDRESS, FACTORY_ABI, PATH_USD, ERC20_ABI, MEME_TOKEN_BYTECODE } from "../config/contracts";
import { Upload, Rocket, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { ethers } from "ethers";

const TARGET_SUFFIX = "cf";

async function mineSalt(
  name: string, symbol: string, imageURI: string, description: string,
  creator: string, predictedSale: string,
  onProgress: (n: number) => void
): Promise<{ salt: `0x${string}`; address: string }> {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const constructorArgs = abiCoder.encode(
    ["string","string","string","string","address","address"],
    [name, symbol, imageURI, description, creator, predictedSale]
  );
  const initCode     = MEME_TOKEN_BYTECODE + constructorArgs.slice(2);
  const initCodeHash = ethers.keccak256(initCode);
  let nonce = 0n;
  while (true) {
    const salt = ethers.zeroPadValue(ethers.toBeHex(nonce), 32) as `0x${string}`;
    const addr = ethers.getCreate2Address(FACTORY_ADDRESS, salt, initCodeHash);
    if (addr.toLowerCase().endsWith(TARGET_SUFFIX)) return { salt, address: addr };
    nonce++;
    if (nonce % 1000n === 0n) onProgress(Number(nonce));
    if (nonce % 5000n === 0n) await new Promise(r => setTimeout(r, 0));
  }
}

export default function CreatePage() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { data: walletClient } = useWalletClient();
  const pub = usePublicClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", symbol: "", imageURI: "", description: "", devBuy: "" });
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState("");
  const [mineProgress, setMineProgress] = useState(0);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const handleImageURL = (url: string) => { set("imageURI", url); setPreview(url); };

  const handleCreate = async () => {
    if (!walletClient || !pub) return;
    if (!form.name || !form.symbol || !form.imageURI) {
      toast.error("Vui long dien day du / Please fill all fields");
      return;
    }
    setLoading(true);
    setMineProgress(0);
    const toastId = toast.loading("Mining vanity address ...cf");
    try {
      // Buoc 1: Predict TokenSale address (la contract dau factory deploy, nonce hien tai)
      const factoryNonce = await pub.getTransactionCount({ address: FACTORY_ADDRESS });
      const predictedSale = ethers.getCreateAddress({ from: FACTORY_ADDRESS, nonce: factoryNonce });
      // Buoc 2: Mine salt
      const { salt } = await mineSalt(
        form.name, form.symbol.toUpperCase(), form.imageURI, form.description,
        address!, predictedSale,
        (n) => { setMineProgress(n); toast.loading(`Mining... ${n.toLocaleString()} iterations`, { id: toastId }); }
      );
      toast.loading("Salt found! Dang tao token...", { id: toastId });
      // Buoc 3: Approve neu co devBuy
      const devBuyRaw = form.devBuy ? BigInt(Math.floor(Number(form.devBuy) * 1e6)) : 0n;
      const devBuyUSD = devBuyRaw > 500_000_000n ? 500_000_000n : devBuyRaw;
      if (devBuyUSD > 0n) {
        const approveTx = await walletClient.writeContract({ address: PATH_USD, abi: ERC20_ABI, functionName: "approve", args: [FACTORY_ADDRESS, devBuyUSD] });
        await pub.waitForTransactionReceipt({ hash: approveTx });
      }
      // Buoc 4: createMeme voi salt
      const hash = await walletClient.writeContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: "createMeme",
        args: [form.name, form.symbol.toUpperCase(), form.imageURI, form.description, devBuyUSD, salt],
      });
      toast.loading("Dang xac nhan... / Confirming...", { id: toastId });
      const receipt = await pub.waitForTransactionReceipt({ hash });
      toast.success("Tao token thanh cong! / Token created!", { id: toastId });
      const memeLog = receipt.logs.find(l => l.topics.length === 4);
      if (memeLog?.topics[1]) {
        const tokenAddr = "0x" + memeLog.topics[1].slice(26);
        navigate("/token/" + tokenAddr);
      } else { navigate("/"); }
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Loi / Error", { id: toastId });
    }
    setLoading(false);
    setMineProgress(0);
  };

  const inputStyle = { width: "100%", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 16px", color: "var(--text-primary)", fontSize: "14px", outline: "none", fontFamily: "inherit" };
  const labelStyle = { fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px", display: "block" };

  return (
    <div style={{ paddingTop: "40px", paddingBottom: "60px", maxWidth: "560px", margin: "0 auto" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
          <Rocket size={24} color="var(--accent)" /> Tao Meme Token / Create
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "6px" }}>Deploy token len Tempo Moderato Testnet trong vai giay</p>
      </div>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
          <div style={{ width: "80px", height: "80px", borderRadius: "12px", border: "2px dashed var(--border)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-secondary)" }}>
            {preview ? <img src={preview} alt="preview" onError={() => setPreview("")} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Upload size={24} color="var(--text-secondary)" />}
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>URL anh / Image URL <span style={{ color: "#ef4444" }}>*</span></label>
            <input style={inputStyle} placeholder="https://i.imgur.com/..." value={form.imageURI} onChange={e => handleImageURL(e.target.value)} />
            <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>Dung Imgur hoac link anh truc tiep / Use Imgur or direct image URL</p>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Ten token / Token Name <span style={{ color: "#ef4444" }}>*</span></label>
          <input style={inputStyle} placeholder="vd: Doge on Tempo" value={form.name} onChange={e => set("name", e.target.value)} maxLength={32} />
        </div>
        <div>
          <label style={labelStyle}>Ky hieu / Symbol <span style={{ color: "#ef4444" }}>*</span></label>
          <input style={inputStyle} placeholder="vd: DOGET" value={form.symbol} onChange={e => set("symbol", e.target.value.toUpperCase())} maxLength={10} />
          <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>Tu dong viet hoa / Auto uppercase</p>
        </div>
        <div>
          <label style={labelStyle}>Mo ta / Description</label>
          <textarea style={{ ...inputStyle, minHeight: "80px", resize: "vertical" } as any} placeholder="Mo ta ngan ve token cua ban..." value={form.description} onChange={e => set("description", e.target.value)} maxLength={200} />
          <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>{form.description.length}/200</p>
        </div>
        <div>
          <label style={labelStyle}>Dev Buy (optional) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â mua truoc Phase 1</label>
          <div style={{ position: "relative" }}>
            <input style={inputStyle} type="number" placeholder="0 (max $500)" max="500" value={form.devBuy} onChange={e => { const v = Number(e.target.value); set("devBuy", v > 500 ? "500" : e.target.value); }} />
            <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: "var(--text-secondary)", fontWeight: 600 }}>USD</span>
          </div>
          <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>Toi da $500 (50% Phase 1). Mua cung tx voi deploy, chong front-run.</p>
        </div>
        {mineProgress > 0 && (
          <div style={{ background: "var(--bg-secondary)", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "var(--text-secondary)" }}>
            ÃƒÂ¢Ã¢â‚¬ÂºÃ‚ÂÃƒÂ¯Ã‚Â¸Ã‚Â Mining vanity address ...cf ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â {mineProgress.toLocaleString()} iterations
          </div>
        )}
        <div style={{ background: "#14532d22", border: "1px solid #22c55e33", borderRadius: "10px", padding: "12px 16px", display: "flex", gap: "10px" }}>
          <AlertCircle size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: "1px" }} />
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
            <p><strong style={{ color: "var(--accent)" }}>Tokenomics:</strong> Tong cung 1,000,000,000 - Phase 1: 10% gia $0.00001 (giam 80%) - Phase 2: AMM tu $0.00005 - Phi 1%</p>
            <p style={{ marginTop: "4px" }}>Phase 1 day du khi dat $1,000 - Phase 2 gia tang dan theo AMM</p>
            <p style={{ marginTop: "4px", color: "var(--accent)" }}>ÃƒÂ¢Ã…â€œÃ‚Â¨ Token address se ket thuc bang ...cf</p>
          </div>
        </div>
        {!isConnected ? (
          <button onClick={() => connect({ connector: injected() })} style={{ width: "100%", background: "var(--accent)", color: "#000", border: "none", padding: "14px", borderRadius: "10px", cursor: "pointer", fontWeight: 700, fontSize: "15px" }}>Ket noi vi de tiep tuc / Connect Wallet</button>
        ) : (
          <button onClick={handleCreate} disabled={loading} style={{ width: "100%", background: loading ? "var(--border)" : "var(--accent)", color: loading ? "var(--text-secondary)" : "#000", border: "none", padding: "14px", borderRadius: "10px", cursor: loading ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "15px", transition: "all 0.2s" }}>
            {loading ? "Mining & deploying..." : "Tao Token / Create Token"}
          </button>
        )}
      </div>
    </div>
  );
}



