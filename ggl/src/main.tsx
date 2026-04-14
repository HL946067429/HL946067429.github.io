import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import Admin from './Admin.tsx';
import './index.css';

// 路径以 /ggl/admin 开头则挂后台，否则挂前台刮刮乐
const isAdmin = window.location.pathname.replace(/\/+$/, '').endsWith('/admin');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdmin ? <Admin /> : <App />}
  </StrictMode>,
);
