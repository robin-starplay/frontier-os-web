import { createRoot } from 'react-dom/client';

import App from './App';
import { UsageProvider } from './contexts/UsageContext';

import './index.css';

createRoot(document.getElementById('root')!).render(<UsageProvider><App /></UsageProvider>);
