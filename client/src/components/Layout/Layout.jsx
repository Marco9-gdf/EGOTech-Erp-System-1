import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import QuickRoleBanner from '../Common/QuickRoleBanner';
import CommandPalette from '../Common/CommandPalette';
import EgotechAIWidget from '../Common/EgotechAIWidget';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setPaletteOpen(true);
    window.addEventListener('open-command-palette', handleOpen);
    return () => window.removeEventListener('open-command-palette', handleOpen);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Demo Quick Switcher Banner */}
      <QuickRoleBanner />

      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
          <Navbar
            onToggleSidebar={() => setSidebarOpen(true)}
            onOpenPalette={() => setPaletteOpen(true)}
          />
          <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Interactive Command Palette */}
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* Floating Egotech AI HR & Tax Assistant */}
      <EgotechAIWidget />
    </div>
  );
}
