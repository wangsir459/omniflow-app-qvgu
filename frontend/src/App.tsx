import { HashRouter, Routes, Route } from 'react-router-dom';
import AppShell from '@/components/custom/AppShell';
import Index from './pages/Index';
import Reserve from './pages/Reserve';
import Equipment from './pages/Equipment';
import NotFound from './pages/NotFound';

const App = () => (
  <HashRouter>
    <AppShell>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/reserve" element={<Reserve />} />
        <Route path="/equipment" element={<Equipment />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppShell>
  </HashRouter>
);

export default App;
