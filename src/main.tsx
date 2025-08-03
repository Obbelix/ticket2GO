import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('main.tsx loaded');

// Simplified initialization - render immediately
function initializeApp() {
  console.log('initializeApp started');
  
  // Always render the React app immediately
  console.log('About to render React app');
  const rootElement = document.getElementById("root");
  console.log('Root element found:', !!rootElement);
  if (rootElement) {
    console.log('Creating root and rendering App component');
    const root = createRoot(rootElement);
    root.render(<App />);
    console.log('App component rendered');
  } else {
    console.error('No root element found!');
  }
}

// Start the app
console.log('Starting app initialization');
initializeApp();