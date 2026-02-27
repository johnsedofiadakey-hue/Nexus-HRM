import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css' // Make sure you have Tailwind imported here

if (localStorage.getItem('nexus_user') === 'undefined') {
  localStorage.removeItem('nexus_user');
  localStorage.removeItem('nexus_token');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)