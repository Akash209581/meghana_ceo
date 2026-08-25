import React, { useState, useEffect } from 'react';
import { FaLock, FaWhatsapp, FaCheckCircle, FaSave, FaTrash, FaList } from 'react-icons/fa';
import { settingsAPI } from '../api';

function Settings() {
  const [adminPin, setAdminPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [adminPhone, setAdminPhone] = useState('+919908939746');
  const [message, setMessage] = useState('');
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [sectors, setSectors] = useState([]);
  const [newSector, setNewSector] = useState('');

  useEffect(() => {
    // Load current PIN from backend (source of truth)
    const loadCurrentPin = async () => {
      try {
        const response = await settingsAPI.getSettings();
        const data = response.data;
        if (data.success) {
          setAdminPin(data.adminPin);
          localStorage.setItem('adminPin', data.adminPin);
          if (data.sectors) setSectors(data.sectors);
        } else {
          // Fallback to localStorage
          const saved = localStorage.getItem('adminPin');
          if (saved) setAdminPin(saved);
        }
      } catch (error) {
        console.error('Error loading PIN from backend:', error);
        // Fallback to localStorage
        const saved = localStorage.getItem('adminPin');
        if (saved) setAdminPin(saved);
      } finally {
        setLoadingSettings(false);
      }
    };
    
    loadCurrentPin();
  }, []);

  const handleChangePIN = async () => {
    if (!newPin || !confirmPin) {
      setMessage('Please fill in all PIN fields');
      return;
    }
    if (newPin !== confirmPin) {
      setMessage('PINs do not match');
      return;
    }
    if (newPin.length !== 4) {
      setMessage('PIN must be exactly 4 digits');
      return;
    }

    try {
      setMessage('Updating PIN...');
      const response = await settingsAPI.updatePin(adminPin, newPin);
      const data = response.data;
      
      if (data.success) {
        // Update localStorage
        localStorage.setItem('adminPin', newPin);
        setAdminPin(newPin);
        
        // Backend automatically syncs database and .env file
        // All environments read from database first, fallback to .env if database unavailable
        
        // Dispatch custom event to update other components
        window.dispatchEvent(new CustomEvent('pinUpdated', { detail: { pin: newPin } }));
        
        setMessage('✓ PIN updated successfully! Changes take effect immediately across all devices.');
        setNewPin('');
        setConfirmPin('');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(`❌ ${data.message || 'Failed to update PIN'}`);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage(`❌ Error updating PIN: ${error.message}`);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleChangeAdminPhone = () => {
    localStorage.setItem('adminPhone', adminPhone);
    // Dispatch custom event to update other components
    window.dispatchEvent(new CustomEvent('adminPhoneUpdated', { detail: { phone: adminPhone } }));
    setMessage('✓ Admin phone updated successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleAddSector = async (e) => {
    e.preventDefault();
    if (!newSector.trim()) return;
    try {
      const response = await settingsAPI.addSector(newSector.trim());
      if (response.data.success) {
        setSectors(response.data.sectors);
        setNewSector('');
        setMessage('✓ Sector added successfully!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage(`❌ Error adding sector: ${error.message}`);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDeleteSector = async (sectorToDelete) => {
    if (!window.confirm(`Are you sure you want to delete ${sectorToDelete}?`)) return;
    try {
      const response = await settingsAPI.deleteSector(sectorToDelete);
      if (response.data.success) {
        setSectors(response.data.sectors);
        setMessage('✓ Sector deleted successfully!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage(`❌ Error deleting sector: ${error.message}`);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">System Settings</h1>
        <p className="text-gray-500 text-lg">Configure system preferences, security, and integrations</p>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`mb-8 px-6 py-4 rounded-2xl font-semibold text-lg border-l-4 ${
          message.includes('✓') 
            ? 'bg-green-50 text-green-800 border-green-600' 
            : 'bg-amber-50 text-amber-800 border-amber-600'
        }`}>
          {message}
        </div>
      )}

      {/* Loading State */}
      {loadingSettings && (
        <div className="mb-8 px-6 py-4 rounded-2xl font-semibold text-lg border-l-4 bg-blue-50 text-blue-800 border-blue-600">
          🔄 Loading current PIN from server...
        </div>
      )}

      {/* PIN Security Section */}
      <div className="bg-white rounded-2xl shadow-md p-8 mb-10 border-t-4 border-blue-600">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-blue-600 text-white p-4 rounded-xl">
            <FaLock className="text-2xl" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">PIN Security</h2>
            <p className="text-gray-600">Change your 4-digit login PIN</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-green-50 border-l-4 border-green-600 rounded-lg p-4">
            <p className="text-sm text-gray-600 font-semibold mb-1">Current Active PIN</p>
            <p className="text-2xl font-bold text-green-600">{loadingSettings ? '••••' : adminPin || '****'}</p>
            <p className="text-xs text-gray-600 mt-2">✓ This PIN is stored in the database and synced across all devices</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase mb-3">New PIN</label>
              <input
                type="password"
                maxLength="4"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-bold text-2xl tracking-widest text-center focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase mb-3">Confirm PIN</label>
              <input
                type="password"
                maxLength="4"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-bold text-2xl tracking-widest text-center focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleChangePIN}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <FaSave /> Update PIN
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-600 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <span className="font-bold">🔐 Security Update:</span> Your PIN is now stored securely in our database. Changes take effect immediately and work across all devices. After logout, use your new PIN to login.
            </p>
          </div>
        </div>
      </div>

      {/* WhatsApp Integration Section */}
      <div className="bg-white rounded-2xl shadow-md p-8 mb-10 border-t-4 border-green-600">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-green-600 text-white p-4 rounded-xl">
            <FaWhatsapp className="text-2xl" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">WhatsApp Configuration</h2>
            <p className="text-gray-600">Current Status: <span className="font-bold text-green-600">✓ Manual Mode</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Current Configuration */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Current Configuration</h3>
            <div className="space-y-4">
              <div className="bg-green-50 border-l-4 border-green-600 rounded-lg p-4">
                <p className="text-sm text-gray-600 font-semibold mb-1">Method</p>
                <p className="text-2xl font-bold text-green-600">Manual (wa.me links)</p>
                <p className="text-xs text-gray-600 mt-2">Tasks are shared via WhatsApp using automatic message generation</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 font-semibold mb-2">Features Available:</p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-gray-700">
                    <FaCheckCircle className="text-green-600" /> Message preview
                  </li>
                  <li className="flex items-center gap-2 text-gray-700">
                    <FaCheckCircle className="text-green-600" /> Editable messages
                  </li>
                  <li className="flex items-center gap-2 text-gray-700">
                    <FaCheckCircle className="text-green-600" /> Multi-contact support
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right: Update Admin Number */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Admin WhatsApp Number</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-600 rounded-lg p-4">
                <p className="text-sm text-gray-600 font-semibold mb-1">Current</p>
                <p className="text-lg font-bold text-blue-600">{adminPhone}</p>
                <p className="text-xs text-gray-600 mt-2">Used for task notifications and updates</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 uppercase mb-3">Update Number</label>
                <input
                  type="tel"
                  placeholder="Include country code (e.g., +919876543210)"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
              <button
                onClick={handleChangeAdminPhone}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
              >
                Update Number
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sector Management Section */}
      <div className="bg-white rounded-2xl shadow-md p-8 mb-10 border-t-4 border-amber-600">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-amber-600 text-white p-4 rounded-xl">
            <FaList className="text-2xl" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Manage Sectors</h2>
            <p className="text-gray-600">Add or remove task sectors</p>
          </div>
        </div>

        <div className="space-y-6">
          <form onSubmit={handleAddSector} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-700 uppercase mb-3">New Sector Name</label>
              <input
                type="text"
                value={newSector}
                onChange={(e) => setNewSector(e.target.value)}
                placeholder="Enter sector name"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-sm focus:border-amber-600 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors"
            >
              Add
            </button>
          </form>

          <div className="mt-6 flex flex-wrap gap-3">
            {sectors && sectors.length > 0 ? sectors.map((sector) => (
              <div key={sector} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full border border-gray-200">
                <span className="font-semibold text-gray-800">{sector}</span>
                <button
                  onClick={() => handleDeleteSector(sector)}
                  className="text-red-500 hover:text-red-700 focus:outline-none ml-2"
                  title="Remove sector"
                >
                  <FaTrash size={14} />
                </button>
              </div>
            )) : (
              <p className="text-gray-500 italic">No sectors configured.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
