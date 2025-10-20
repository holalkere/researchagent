import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import { initializeIcons } from "@fluentui/react";

import "./index.css";

import Layout from "./pages/layout/Layout";
import NoPage from "./pages/NoPage";
import Chat from "./pages/chat/Chat";
import About from "./pages/about/About";
import Admin from "./pages/admin/Admin";
import { AppStateProvider } from "./state/AppProvider";

initializeIcons();

export default function App() {
    return (
        <AppStateProvider>
            <HashRouter>
                <Routes>
                    <Route path="/" element={<Layout />}>
                        <Route index element={<Chat />} />
                        <Route path="about" element={<About />} />
                        <Route path="admin" element={<Admin />} />
                        <Route path="*" element={<NoPage />} />
                    </Route>
                </Routes>
            </HashRouter>
        </AppStateProvider>
    );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
