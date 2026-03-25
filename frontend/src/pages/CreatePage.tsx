import { useState, useRef } from "react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    const toastId = toast.loading("Uploading image...");
    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (!data.secure_url) throw new Error(data?.error?.message ?? "Upload failed");
      set("imageURI", data.secure_url);
      setPreview(data.secure_url);
      toast.success("Image uploaded!", { id: toastId });
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed. Try a direct image URL instead.", { id: toastId });
    }
  };

  const handleCreate = async () => {
    if (!walletClient || !pub) return;
    if (!form.name || !form.symbol || !form.imageURI) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    setMineProgress(0);
    const toastId = toast.loading("Mining vanity address...");
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
      toast.loading("Salt found! Deploying token...", { id: toastId });
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
      toast.loading("Confirming...", { id: toastId });
      const receipt = await pub.waitForTransactionReceipt({ hash });
      toast.success("Token launched successfully!", { id: toastId });
      const memeLog = receipt.logs.find(l => l.topics.length === 4);
      if (memeLog?.topics[1]) {
        const tokenAddr = "0x" + memeLog.topics[1].slice(26);
        navigate("/token/" + tokenAddr);
      } else { navigate("/"); }
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Error", { id: toastId });
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
          <Rocket size={24} color="var(--accent)" /> Launch Meme Token
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "6px" }}>Deploy your token to Tempo Moderato Testnet in seconds</p>
      </div>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
          <div style={{ width: "80px", height: "80px", borderRadius: "12px", border: "2px dashed var(--border)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-secondary)" }}>
            {preview ? <img src={preview} alt="preview" onError={() => setPreview("")} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Upload size={24} color="var(--text-secondary)" />}
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Image <span style={{ color: "#ef4444" }}>*</span></label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{ width: "100%", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 16px", color: form.imageURI ? "var(--text-primary)" : "var(--text-secondary)", fontSize: "14px", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
            >
              {form.imageURI ? "✓ Image ready" : "📁 Upload from device"}
            </button>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Token Name <span style={{ color: "#ef4444" }}>*</span></label>
          <input style={inputStyle} placeholder="e.g. Doge on Tempo" value={form.name} onChange={e => set("name", e.target.value)} maxLength={32} />
        </div>
        <div>
          <label style={labelStyle}>Symbol <span style={{ color: "#ef4444" }}>*</span></label>
          <input style={inputStyle} placeholder="e.g. DOGET" value={form.symbol} onChange={e => set("symbol", e.target.value.toUpperCase())} maxLength={10} />
          <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>Auto uppercase</p>
        </div>
        <div>
          <label style={labelStyle}>Description</label>
          <textarea style={{ ...inputStyle, minHeight: "80px", resize: "vertical" } as any} placeholder="Short description of your token..." value={form.description} onChange={e => set("description", e.target.value)} maxLength={200} />
          <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>{form.description.length}/200</p>
        </div>
        <div>
          <label style={labelStyle}>Dev Buy (optional) — buy before Phase 1 opens</label>
          <div style={{ position: "relative" }}>
            <input style={inputStyle} type="number" placeholder="0 (max $500)" max="500" value={form.devBuy} onChange={e => { const v = Number(e.target.value); set("devBuy", v > 500 ? "500" : e.target.value); }} />
            <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: "var(--text-secondary)", fontWeight: 600 }}>USD</span>
          </div>
          <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>Max $500 (50% of Phase 1). Purchased in the same tx as deploy, front-run protected.</p>
        </div>
        {mineProgress > 0 && (
          <div style={{ background: "var(--bg-secondary)", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "var(--text-secondary)" }}>
            ⏳ Mining vanity address... — {mineProgress.toLocaleString()} iterations
          </div>
        )}
        <div style={{ background: "#14532d22", border: "1px solid #22c55e33", borderRadius: "10px", padding: "12px 16px", display: "flex", gap: "10px" }}>
          <AlertCircle size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: "1px" }} />
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
            <p><strong style={{ color: "var(--accent)" }}>Tokenomics:</strong></p>
            <p style={{ marginTop: "4px" }}>Phase 1: 10% supply at <strong>$0.00001/token</strong> — 80% cheaper than Phase 2 start price</p>
            <p style={{ marginTop: "4px" }}>Phase 2: AMM bonding curve, starts at <strong>~$0.0000315/token</strong> — price increases as more tokens are bought</p>
            <p style={{ marginTop: "4px", color: "var(--accent)" }}>🚀 Token address will end with ...cf</p>
          </div>
        </div>
        {!isConnected ? (
          <button onClick={() => connect({ connector: injected() })} style={{ width: "100%", background: "var(--accent)", color: "#000", border: "none", padding: "14px", borderRadius: "10px", cursor: "pointer", fontWeight: 700, fontSize: "15px" }}>Connect Wallet to continue</button>
        ) : (
          <button onClick={handleCreate} disabled={loading} style={{ width: "100%", background: loading ? "var(--border)" : "var(--accent)", color: loading ? "var(--text-secondary)" : "#000", border: "none", padding: "14px", borderRadius: "10px", cursor: loading ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "15px", transition: "all 0.2s" }}>
            {loading ? "Launching token..." : "Launch Token"}
          </button>
        )}
      </div>
    </div>
  );
}



