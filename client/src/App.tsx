import { Route, Switch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "@/lib/queryClient";
import Dashboard from "@/pages/dashboard";
import Transactions from "@/pages/transactions";
import Wallets from "@/pages/wallets";
import ApiKeys from "@/pages/api-keys";
import NotFound from "@/pages/not-found";
import { Sidebar } from "@/components/sidebar";
import { useState } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/wallets" component={Wallets} />
      <Route path="/api-keys" component={ApiKeys} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        {/* Main Content */}
        <div className="lg:pl-64">
          {/* Top Bar */}
          <div className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-8">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <div className="ml-4 lg:ml-0">
                <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500">Overview of your crypto accounting data</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button className="p-2 rounded-md text-gray-500 hover:text-gray-700">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </button>
              
              <button className="p-2 rounded-md text-gray-500 hover:text-gray-700 relative">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-2H4v2zM4 12h8v-2H4v2zM4 5h12V3H4v2z" />
                </svg>
                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
              
              <button className="p-2 rounded-full text-gray-500 hover:text-gray-700 bg-gray-100">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Page Content */}
          <main className="py-6 px-4 sm:px-6 lg:px-8">
            <Router />
          </main>
        </div>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;