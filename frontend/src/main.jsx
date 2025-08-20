import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './global-style.css'
import './styles/animation-overrides.css'
import { initializeAnimationMode } from './utils/animationSettings'
import AppHome from './AppHome.jsx'
import ControlSurfacePage from './ControlSurfacePage.jsx'
import ControlPadPage from './ControlPadPage.jsx'
import ComparisonPage from './components/ComparisonPage.jsx'
import PresenterView from './PresenterView.jsx'
import TestBroadcastText from './TestBroadcastText.jsx'
import AnimationDiagnostics from './AnimationDiagnostics.jsx'
import MinimalAnimationTest from './MinimalAnimationTest.jsx'
import IconTest from './icon-test.jsx'
import ToolbarDebug from './toolbar-debug.jsx'

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
  
  if (path === '/compare') {
    return <ComparisonPage />;
  }
  
  if (path === '/test-broadcast') {
    return <TestBroadcastText />;
  }
  
  if (path === '/animation-diagnostics') {
    return <AnimationDiagnostics />;
  }
  
  if (path === '/minimal-test') {
    return <MinimalAnimationTest />;
  }
  
  if (path === '/icon-test') {
    return <IconTest />;
  }
  
  if (path === '/toolbar-debug') {
    return <ToolbarDebug />;
  }
  
  return <AppHome />;
};

// Initialize animation settings before rendering
initializeAnimationMode();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
