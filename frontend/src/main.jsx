import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './global-style.css'
import AppHome from './AppHome.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppHome />
  </StrictMode>,
)
