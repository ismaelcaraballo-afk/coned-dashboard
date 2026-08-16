import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import LegacyApp from './legacy/App.jsx'
import M3Preview from './next/M3Preview.jsx'
import RankingsPage from './next/RankingsPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/legacy" element={<LegacyApp />} />
        <Route path="/m3-preview" element={<M3Preview />} />
        <Route path="/rankings" element={<RankingsPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
