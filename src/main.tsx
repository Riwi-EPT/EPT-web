import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
// Self-hosted fonts (no remote Google Fonts request — works offline / avoids
// third-party egress). Variable builds cover every weight the UI uses.
import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/jetbrains-mono';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
