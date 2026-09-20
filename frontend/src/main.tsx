import React from 'react';
import ReactDOM from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import App from './App';
import './index.css';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: (import.meta as any).env.VITE_COGNITO_USER_POOL_ID || '',
      userPoolClientId: (import.meta as any).env.VITE_COGNITO_CLIENT_ID || '',
    }
  }
});

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
