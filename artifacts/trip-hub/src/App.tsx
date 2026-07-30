import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { BottomNav } from '@/components/layout/BottomNav';

import Home from '@/pages/Home';
import Villa from '@/pages/Villa';
import Crew from '@/pages/Crew';
import Money from '@/pages/Money';
import Travel from '@/pages/Travel';
import Explore from '@/pages/Explore';
import Weekend from '@/pages/Weekend';
import NeedToKnow from '@/pages/NeedToKnow';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <div className="pb-24 max-w-md mx-auto min-h-[100dvh] bg-sand-50 relative shadow-2xl shadow-ink-900/5">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/villa" component={Villa} />
        <Route path="/crew" component={Crew} />
        <Route path="/money" component={Money} />
        <Route path="/travel" component={Travel} />
        <Route path="/explore" component={Explore} />
        <Route path="/weekend" component={Weekend} />
        <Route path="/need-to-know" component={NeedToKnow} />
        <Route component={NotFound} />
      </Switch>
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}

export default App;
