import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "./App";

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/offers" element={<App />} />
        <Route path="/offers/:offerId" element={<App />} />
        <Route path="/merchants/:merchantId" element={<App />} />
        <Route path="/cart" element={<App />} />
        <Route path="/checkout" element={<App />} />
        <Route path="/orders" element={<App />} />
        <Route path="/orders/:orderId" element={<App />} />
        <Route path="/profile" element={<App />} />
        <Route path="/notifications" element={<App />} />
        <Route path="/dashboard" element={<App />} />
        <Route path="/merchant" element={<App />} />
        <Route path="/admin" element={<App />} />
        <Route path="/login" element={<App />} />
        <Route path="/register" element={<App />} />
        <Route path="/payment/result" element={<App />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
