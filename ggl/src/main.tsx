import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import Admin from './Admin.tsx';
import Wheel from './Wheel.tsx';
import './index.css';

// 路径判断（去尾部斜杠后 endsWith 匹配）
const path = window.location.pathname.replace(/\/+$/, '');
const isAdmin = path.endsWith('/admin');
const isWheel = path.endsWith('/wheel');

function Root() {
  if (isAdmin) return <Admin />;
  if (isWheel) return <Wheel />;
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
