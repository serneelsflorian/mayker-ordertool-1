import { Routes, Route } from "react-router-dom";
import TopBar from "./components/TopBar";
import HomePage from "./routes/HomePage";
import OrderAdminPage from "./routes/OrderAdminPage";
import GuestOrderPage from "./routes/GuestOrderPage";

export default function App() {
  return (
    <div
      className="min-h-screen w-full"
      style={{ background: "var(--bg-soft)" }}
    >
      <TopBar />
      <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/order/:id/guest" element={<GuestOrderPage />} />
          <Route path="/order/:id" element={<OrderAdminPage />} />
        </Routes>
      </main>
    </div>
  );
}
