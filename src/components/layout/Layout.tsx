import React, { Dispatch, SetStateAction } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { User, AppNotification } from '../../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  title: string;
  user: User;
  onLogout: () => void;
  notifications: AppNotification[];
  setNotifications: Dispatch<SetStateAction<AppNotification[]>>;
}

export default function Layout({ children, activeTab, onTabChange, title, user, onLogout, notifications, setNotifications }: LayoutProps) {
  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} user={user} onLogout={onLogout} />

      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header title={title} user={user} notifications={notifications} setNotifications={setNotifications} />

        <div className="flex-1 p-6 overflow-y-auto w-full relative">
          {/* Bus background */}
          <div
            className="pointer-events-none fixed bottom-0 right-0 w-[700px] h-[400px] opacity-[0.04] bg-no-repeat bg-contain bg-right-bottom z-0"
            style={{ backgroundImage: 'url(/bus-background.jpeg)' }}
          />
          <div key={activeTab} className="max-w-7xl mx-auto h-full space-y-6 page-enter relative z-[1]">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
