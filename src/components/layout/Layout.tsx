import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { User } from '../../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  title: string;
  user: User;
  onLogout: () => void;
}

export default function Layout({ children, activeTab, onTabChange, title, user, onLogout }: LayoutProps) {
  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} user={user} onLogout={onLogout} />

      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header title={title} user={user} />

        <div className="flex-1 p-6 overflow-y-auto w-full">
          <div key={activeTab} className="max-w-7xl mx-auto h-full space-y-6 page-enter">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
