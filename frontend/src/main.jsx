import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './config/firebase.js'; // Initialize Firebase on app start
import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
