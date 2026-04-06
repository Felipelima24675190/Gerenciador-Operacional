import React, { useState, Dispatch, SetStateAction } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { User, AppNotification } from '../../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  title: string;
  breadcrumb?: string;
  user: User;
  onLogout: () => void;
  notifications: AppNotification[];
  setNotifications: Dispatch<SetStateAction<AppNotification[]>>;
}

export default function Layout({ children, activeTab, onTabChange, title, breadcrumb, user, onLogout, notifications, setNotifications }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex bg-surface font-sans">
      <Sidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        user={user}
        onLogout={onLogout}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
      />

      <main
        className="flex-1 flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? 68 : 256 }}
      >
        <Header
          title={title}
          breadcrumb={breadcrumb}
          user={user}
          notifications={notifications}
          setNotifications={setNotifications}
          onTabChange={onTabChange}
        />

        <div className="flex-1 p-5 overflow-y-auto w-full relative">
          {/* Bus background decoration */}
          <div
            className="pointer-events-none fixed bottom-0 right-0 w-[700px] h-[400px] opacity-[0.03] bg-no-repeat bg-contain bg-right-bottom z-0 no-print"
            style={{ backgroundImage: 'url(/bus-background.jpeg)' }}
            aria-hidden="true"
          />
          <div key={activeTab} className="max-w-7xl mx-auto h-full space-y-5 page-enter relative z-[1]">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
