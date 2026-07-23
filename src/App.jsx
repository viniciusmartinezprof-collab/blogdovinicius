import { Navigate, Route, Routes } from "react-router-dom";
import AdminPage from "./pages/AdminPage.jsx";
import PublicPortal from "./pages/PublicPortal.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicPortal />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
