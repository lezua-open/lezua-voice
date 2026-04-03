import React from 'react';
import ReactDOM from 'react-dom/client';
import '../shared/ui/shared-ui.css';
import './styles.css';
import { QuickPanelApp } from './quick-panel-app';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QuickPanelApp />
  </React.StrictMode>,
);
