import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './global-style.css'
import AppHome from './AppHome.jsx'
import ControlSurfacePage from './ControlSurfacePage.jsx'
import ControlPadPage from './ControlPadPage.jsx'
import ComparisonPage from './components/ComparisonPage.jsx'

// Simple routing based on URL path
const App = () => {
  const path = window.location.pathname;
  
  if (path === '/control-surface') {
    return <ControlSurfacePage />;
  }
  
  if (path === '/control-pad') {
    return <ControlPadPage />;
  }
  
  if (path === '/compare') {
    return <ComparisonPage />;
  }
  
  return <AppHome />;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
