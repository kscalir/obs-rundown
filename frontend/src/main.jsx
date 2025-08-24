// main.jsx - Updated version
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './consolidated-TEST.css'
import AppHome from './AppHome.jsx'
import ControlSurfacePage from './ControlSurfacePage.jsx'
import ControlPadPage from './ControlPadPage.jsx'
import PresenterView from './PresenterView.jsx'
import { GraphicsEditor } from './components/graphics'

// Set consistent root class
const rootElement = document.getElementById('root');
rootElement.className = 'app-root';

// Simple routing based on URL path
const App = () => {
  const path = window.location.pathname;
  
  if (path === '/control-surface') {
    return <ControlSurfacePage />;
  }
  
  if (path === '/control-pad') {
    return <ControlPadPage />;
  }
  
  if (path === '/presenter') {
    return <PresenterView />;
  }
  
  if (path === '/graphics-editor') {
    return <GraphicsEditor />;
  }

  return <AppHome />;
};

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)