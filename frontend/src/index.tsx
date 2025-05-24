import React from 'react';
import ReactDOM from 'react-dom/client';
import BonsolCalculatorApp from './BonsolCalculatorApp.tsx';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <BonsolCalculatorApp />
  </React.StrictMode>
); 
