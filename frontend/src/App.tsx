import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import FeedPage from "./pages/FeedPage";
import CreatePage from "./pages/CreatePage";
import TokenPage from "./pages/TokenPage";
import ProfilePage from "./pages/ProfilePage";

export default function App() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      <Navbar />
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 16px" }}>
        <Routes>
          <Route path="/" element={<FeedPage />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/token/:address" element={<TokenPage />} />
          <Route path="/profile/:address" element={<ProfilePage />} />
        </Routes>
      </main>
    </div>
  );
}
