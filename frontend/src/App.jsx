import React, { useState, useEffect, useCallback } from 'react';
import { FaHome, FaTasks, FaPhone, FaCog, FaSignOutAlt, FaHistory, FaBell, FaFileAlt } from 'react-icons/fa';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Tasks from './components/Tasks';
import Contacts from './components/Contacts';
import Settings from './components/Settings';
import TaskHistory from './components/TaskHistory';
import TaskDetails from './components/TaskDetails';
import Notifications from './components/Notifications';
import TaskAcknowledgement from './components/TaskAcknowledgement';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminPin, setAdminPin] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState(null); // New state for assignee filtering
  const [selectedStatus, setSelectedStatus] = useState('all'); // New state for status filtering
  const [selectedSector, setSelectedSector] = useState('all'); // New state for sector filtering
  const [selectedTaskId, setSelectedTaskId] = useState(null); // State for task details page

  // Check if we're on acknowledgement page
  const isAcknowledgementPage = window.location.pathname.includes('/acknowledge/');

  useEffect(() => {
    const savedPin = localStorage.getItem('adminPin');
    if (savedPin) {
      setIsLoggedIn(true);
      setAdminPin(savedPin);
    }

    // Listen for storage changes (PIN updates from Settings)
    const handleStorageChange = (e) => {
      if (e.key === 'adminPin' && e.newValue) {
        setAdminPin(e.newValue);
        console.log('✅ PIN updated from Settings:', e.newValue);
      }
      if (e.key === 'adminPhone') {
        console.log('✅ Admin WhatsApp number updated:', e.newValue);
      }
    };

    // Listen for custom events from Settings component
    const handlePinUpdated = (e) => {
      setAdminPin(e.detail.pin);
      console.log('✅ PIN updated (real-time):', e.detail.pin);
    };

    const handlePhoneUpdated = (e) => {
      console.log('✅ Admin WhatsApp updated (real-time):', e.detail.phone);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('pinUpdated', handlePinUpdated);
    window.addEventListener('adminPhoneUpdated', handlePhoneUpdated);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('pinUpdated', handlePinUpdated);
      window.removeEventListener('adminPhoneUpdated', handlePhoneUpdated);
    };
  }, []);

  const handleLogin = useCallback((pin) => {
    setAdminPin(pin);
    localStorage.setItem('adminPin', pin);
    setIsLoggedIn(true);
    setActiveTab('dashboard');
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('adminPin');
    setIsLoggedIn(false);
    setAdminPin('');
    setActiveTab('dashboard');
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false); // Close sidebar on mobile when tab is clicked
    // Reset filters when navigating away from tasks
    if (tab !== 'tasks') {
      setSelectedAssignee(null);
      setSelectedStatus('all');
      setSelectedSector('all');
    }
  };

  const handleNavigateToTasksByAssignee = (assigneeName, statusFilter = 'all', sectorFilter = 'all') => {
    setSelectedAssignee(assigneeName);
    setSelectedStatus(statusFilter);
    setSelectedSector(sectorFilter);
    setActiveTab('tasks');
    setSidebarOpen(false); // Close sidebar on mobile
  };

  const handleOpenTaskDetails = (taskId) => {
    setSelectedTaskId(taskId);
    setActiveTab('task-details');
    setSidebarOpen(false); // Close sidebar on mobile
  };

  const handleBackToHistory = () => {
    setSelectedTaskId(null);
    setActiveTab('history');
  };

  // Show acknowledgement page if URL matches the pattern
  if (isAcknowledgementPage) {
    return <TaskAcknowledgement />;
  }

  // If not logged in, show login page only
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-slate-800 text-white p-2 rounded-lg"
      >
        ☰
      </button>

      {/* Sidebar Navigation - Mobile Responsive */}
      <nav className={`fixed left-0 top-0 h-screen w-72 bg-slate-800 text-white shadow-2xl z-40 border-r border-slate-700 transition-transform duration-300 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Sidebar Header */}
        <div className="border-b border-slate-700 p-6 bg-gradient-to-b from-slate-800 to-slate-900">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg p-2.5 shadow-lg">
              <FaTasks className="text-white text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Task Tracker</h1>
              <p className="text-slate-400 text-xs font-semibold tracking-wide">Admin Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <ul className="space-y-1 p-4 mt-4">
          <li>
            <button
              className={`w-full px-6 py-3 text-left flex items-center gap-4 rounded-lg transition-all duration-200 font-medium ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 shadow-lg border-l-4 border-indigo-300'
                  : 'hover:bg-slate-700 border-l-4 border-transparent hover:border-indigo-500'
              }`}
              onClick={() => handleTabChange('dashboard')}
            >
              <FaHome className="text-lg" /> Dashboard
            </button>
          </li>
          <li>
            <button
              className={`w-full px-6 py-3 text-left flex items-center gap-4 rounded-lg transition-all duration-200 font-medium ${
                activeTab === 'tasks'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 shadow-lg border-l-4 border-indigo-300'
                  : 'hover:bg-slate-700 border-l-4 border-transparent hover:border-indigo-500'
              }`}
              onClick={() => handleTabChange('tasks')}
            >
              <FaTasks className="text-lg" /> Tasks
            </button>
          </li>
          <li>
            <button
              className={`w-full px-6 py-3 text-left flex items-center gap-4 rounded-lg transition-all duration-200 font-medium ${
                activeTab === 'contacts'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 shadow-lg border-l-4 border-indigo-300'
                  : 'hover:bg-slate-700 border-l-4 border-transparent hover:border-indigo-500'
              }`}
              onClick={() => handleTabChange('contacts')}
            >
              <FaPhone className="text-lg" /> Contacts
            </button>
          </li>
          <li>
            <button
              className={`w-full px-6 py-3 text-left flex items-center gap-4 rounded-lg transition-all duration-200 font-medium ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 shadow-lg border-l-4 border-indigo-300'
                  : 'hover:bg-slate-700 border-l-4 border-transparent hover:border-indigo-500'
              }`}
              onClick={() => handleTabChange('history')}
            >
              <FaHistory className="text-lg" /> History
            </button>
          </li>
          <li>
            <button
              className={`w-full px-6 py-3 text-left flex items-center gap-4 rounded-lg transition-all duration-200 font-medium ${
                activeTab === 'task-details'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 shadow-lg border-l-4 border-indigo-300'
                  : 'hover:bg-slate-700 border-l-4 border-transparent hover:border-indigo-500'
              }`}
              onClick={() => handleTabChange('task-details')}
              style={{ display: activeTab === 'task-details' ? 'flex' : 'none' }}
            >
              <FaFileAlt className="text-lg" /> Task Details
            </button>
          </li>
          <li>
            <button
              className={`w-full px-6 py-3 text-left flex items-center gap-4 rounded-lg transition-all duration-200 font-medium ${
                activeTab === 'notifications'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 shadow-lg border-l-4 border-indigo-300'
                  : 'hover:bg-slate-700 border-l-4 border-transparent hover:border-indigo-500'
              }`}
              onClick={() => handleTabChange('notifications')}
            >
              <FaBell className="text-lg" /> Notifications
            </button>
          </li>
          <li>
            <button
              className={`w-full px-6 py-3 text-left flex items-center gap-4 rounded-lg transition-all duration-200 font-medium ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 shadow-lg border-l-4 border-indigo-300'
                  : 'hover:bg-slate-700 border-l-4 border-transparent hover:border-indigo-500'
              }`}
              onClick={() => handleTabChange('settings')}
            >
              <FaCog className="text-lg" /> Settings
            </button>
          </li>

          {/* Divider */}
          <li className="my-4 border-t border-blue-600"></li>

          {/* Logout */}
          <li>
            <button
              className="w-full px-6 py-3 text-left flex items-center gap-4 rounded-lg transition-all duration-300 font-medium text-red-200 hover:bg-red-600 hover:text-white"
              onClick={handleLogout}
            >
              <FaSignOutAlt className="text-lg" /> Logout
            </button>
          </li>
        </ul>

        {/* Bottom Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-600 bg-blue-800">
          <p className="text-xs text-blue-200 text-center">Task Tracker v1.0</p>
          <p className="text-xs text-blue-300 text-center mt-1">Admin Management System</p>
        </div>
      </nav>

      {/* Main Content - Responsive */}
      <main className="lg:ml-72 flex-1 p-4 lg:p-8 overflow-y-auto w-full pt-16 lg:pt-0">
        {activeTab === 'dashboard' && <Dashboard adminPin={adminPin} onNavigateToTasks={handleNavigateToTasksByAssignee} />}
        {activeTab === 'tasks' && <Tasks adminPin={adminPin} selectedAssignee={selectedAssignee} selectedStatus={selectedStatus} selectedSector={selectedSector} />}
        {activeTab === 'contacts' && <Contacts />}
        {activeTab === 'notifications' && <Notifications />}
        {activeTab === 'history' && <TaskHistory onTaskClick={handleOpenTaskDetails} />}
        {activeTab === 'task-details' && selectedTaskId && <TaskDetails taskId={selectedTaskId} onBack={handleBackToHistory} />}
        {activeTab === 'settings' && <Settings />}
      </main>
    </div>
  );
}

export default App;
