import { Switch, Route, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConfigProvider } from "@/contexts/ConfigContext";
import { ScheduleProvider } from "@/contexts/ScheduleContext";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";

// Renomeei sua função local para "AppRoutes" para não confundir com o Router do wouter
function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Pega o caminho base configurado no vite.config.ts (que é /AutoScale/)
  // e remove a barra final para ficar no formato que o wouter gosta
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ConfigProvider>
          <ScheduleProvider>
            {/* Envolvemos tudo no WouterRouter com o base correto */}
            <WouterRouter base={basePath}>
              <Toaster />
              <AppRoutes />
            </WouterRouter>
          </ScheduleProvider>
        </ConfigProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;