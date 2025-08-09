import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppHome from './AppHome.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppHome />
  </StrictMode>,
)
