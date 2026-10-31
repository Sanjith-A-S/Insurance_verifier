// ──────────────────────────────────────────────────────────────────────
//  apps/verifier/src/main.tsx
// ──────────────────────────────────────────────────────────────────────
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import '@claimlens/shared/styles/tokens.css';
import '@claimlens/shared/styles/base.css';

import { DemoIdentityContext, createDemoIdentityState } from '@claimlens/shared/hooks/useDemoIdentity';
import { client } from './client';
import { App } from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

const useIdentity = createDemoIdentityState(client, 'verifier');

function Root() {
  const identityState = useIdentity();

  return (
    <QueryClientProvider client={queryClient}>
      <DemoIdentityContext.Provider value={identityState}>
        <App />
      </DemoIdentityContext.Provider>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

