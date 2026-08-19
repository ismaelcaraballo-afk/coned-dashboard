import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import LegacyApp from './legacy/App.jsx'
import M3Preview from './next/M3Preview.jsx'
import RankingsPage from './next/RankingsPage.jsx'
import NotFound from './next/NotFound.jsx'
import M4Preview from './next/M4Preview.jsx'
import CaseFileContainer from './next/CaseFileContainer.jsx'
import ReportPage from './next/ReportPage.jsx'
import MethodologyPage from './next/MethodologyPage.jsx'
import ThisWeekPage from './next/ThisWeekPage.jsx'
import DigestPage from './next/DigestPage.jsx'
import CommandPalette from './next/CommandPalette.jsx'
import ProvenanceStrip from './next/ProvenanceStrip.jsx'

function AppShell() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <>
      <ProvenanceStrip />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/legacy" element={<LegacyApp />} />
        <Route path="/rankings" element={<RankingsPage />} />
        <Route path="/case-file/:bbl" element={<CaseFileContainer />} />
        <Route path="/report/:bbl" element={<ReportPage />} />
        <Route path="/methodology" element={<MethodologyPage />} />
        <Route path="/this-week" element={<ThisWeekPage />} />
        <Route path="/digest" element={<DigestPage />} />
        {import.meta.env.DEV && <Route path="/m3-preview" element={<M3Preview />} />}
        {import.meta.env.DEV && <Route path="/m4-preview" element={<M4Preview />} />}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  </StrictMode>,
)
