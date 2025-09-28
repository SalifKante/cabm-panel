import { Routes, Route, Link } from "react-router-dom";
import Login from "./pages/Login";

export default function App() {
  return (
    <div>
      <Login />
      {/* <Routes>
        <Route path="/login" element={<Login />} />
      </Routes> */}
    </div>
  );
}
