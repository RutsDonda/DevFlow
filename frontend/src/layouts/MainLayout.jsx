import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  HiOutlineHome, 
  HiOutlineFolder, 
  HiOutlineCpuChip, 
  HiOutlineCog6Tooth,
  HiOutlineSparkles,
  HiArrowRightOnRectangle
} from 'react-icons/hi2';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const navigation = [
    { name: 'Dashboard', href: '/', icon: HiOutlineHome },
    { name: 'Projects', href: '/projects', icon: HiOutlineFolder },
    { name: 'Agents', href: '/agents', icon: HiOutlineCpuChip },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col hidden md:flex">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-800">
          <HiOutlineSparkles className="w-6 h-6 text-indigo-500 mr-2" />
          <span className="text-white font-bold text-lg tracking-tight">AI DevFlow</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) => `
                flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                ${isActive 
                  ? 'bg-indigo-500/10 text-indigo-400' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }
              `}
            >
              <item.icon className={`w-5 h-5 mr-3 flex-shrink-0 ${
                // Use a different color logic here if needed, or rely on parent group colors
                '' 
              }`} />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* System Status */}
        <div className="px-6 py-4 border-t border-gray-800">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></div>
            <span className="text-xs font-medium text-gray-400">System Online</span>
          </div>
        </div>

        {/* User Footer */}
        <div className="px-4 py-4 border-t border-gray-800">
          <div className="flex items-center mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email || 'user@example.com'}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
          >
            <HiArrowRightOnRectangle className="w-5 h-5 mr-3" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header (visible only on small screens) */}
        <header className="md:hidden h-16 bg-gray-900 border-b border-gray-800 flex items-center px-4">
          <HiOutlineSparkles className="w-6 h-6 text-indigo-500 mr-2" />
          <span className="text-white font-bold text-lg tracking-tight">AI DevFlow</span>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-gray-950 p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
