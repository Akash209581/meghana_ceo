import React, { useEffect, useState } from 'react';
import { FaHistory, FaPhone, FaCheckCircle, FaTimesCircle, FaClock, FaUser, FaClipboard } from 'react-icons/fa';
import { getAPIBaseURL } from '../api';

function TaskHistory({ onTaskClick }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected
  const [contactsMap, setContactsMap] = useState(new Map());

  useEffect(() => {
    fetchTaskHistory();
    // Load once on mount only - no auto-refresh to prevent excessive reloading
  }, []);

  // Fetch contacts on component mount
  useEffect(() => {
    loadContactsMap();
  }, []);

  const loadContactsMap = async () => {
    try {
      const response = await fetch(getAPIBaseURL() + '/contacts/all', {
        headers: {
          'adminPin': localStorage.getItem('adminPin') || '1234',
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const contacts = await response.json();
        const map = new Map();
        contacts.forEach(contact => {
          map.set(contact.name, contact.phone);
          map.set(contact.name.toLowerCase(), contact.phone);
        });
        setContactsMap(map);
      }
    } catch (err) {
      console.warn('Could not fetch contacts map:', err);
    }
  };

  const getContactPhone = (assignedToName) => {
    if (!assignedToName) return 'N/A';
    // Try to get from map
    const phone = contactsMap.get(assignedToName) || contactsMap.get(assignedToName.toLowerCase());
    if (phone) return phone;
    // Try to extract from assignedToName (might be in format "Name (+91...)") 
    const phoneMatch = assignedToName.match(/\(\+[\d\s\-]+\)/);
    if (phoneMatch) {
      return phoneMatch[0].replace(/[^\d+]/g, '');
    }
    return 'N/A';
  };

  const fetchTaskHistory = async () => {
    try {
      setLoading(true);
      const adminPin = localStorage.getItem('adminPin') || '1234';
      const apiBaseURL = getAPIBaseURL();
      const response = await fetch(`${apiBaseURL}/tasks/all`, {
        headers: {
          'admin-pin': adminPin,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      } else {
        setError('Failed to load task history');
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to connect to server');
      setLoading(false);
    }
  };

  const handleRefreshTasks = () => {
    fetchTaskHistory();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold flex items-center gap-1"><FaClock size={12} /> Pending</span>;
      case 'Completed':
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold flex items-center gap-1"><FaCheckCircle size={12} /> Completed</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">{status}</span>;
    }
  };

  const getExtensionStatusBadge = (extensionRequests) => {
    if (!extensionRequests || extensionRequests.length === 0) {
      return <span className="text-sm text-gray-500">No requests</span>;
    }

    const lastRequest = extensionRequests[extensionRequests.length - 1];
    if (lastRequest.status === 'approved') {
      return <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-semibold flex items-center gap-1"><FaCheckCircle size={11} /> Approved</span>;
    }
    if (lastRequest.status === 'rejected') {
      return <span className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-semibold flex items-center gap-1"><FaTimesCircle size={11} /> Rejected</span>;
    }
    return <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-semibold flex items-center gap-1"><FaClock size={11} /> Pending</span>;
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    
    const lastExtension = task.extensionRequests && task.extensionRequests.length > 0
      ? task.extensionRequests[task.extensionRequests.length - 1]
      : null;

    if (filter === 'pending') return lastExtension?.status === 'pending' || !lastExtension;
    if (filter === 'approved') return lastExtension?.status === 'approved';
    if (filter === 'rejected') return lastExtension?.status === 'rejected';
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading task history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FaHistory className="text-3xl text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-800">Task History</h1>
          </div>
          <p className="text-gray-600">View all assigned tasks and their extension requests</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
            <p className="text-red-700 font-semibold">{error}</p>
          </div>
        )}

        {/* Filter Buttons */}
        <div className="mb-6 flex flex-wrap gap-2">
          {['all', 'pending', 'approved', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filter === f
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-500'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'all' && ` (${tasks.length})`}
              {f === 'pending' && ` (${tasks.filter(t => !t.extensionRequests?.length || t.extensionRequests[t.extensionRequests.length - 1]?.status === 'pending').length})`}
              {f === 'approved' && ` (${tasks.filter(t => t.extensionRequests?.length && t.extensionRequests[t.extensionRequests.length - 1]?.status === 'approved').length})`}
              {f === 'rejected' && ` (${tasks.filter(t => t.extensionRequests?.length && t.extensionRequests[t.extensionRequests.length - 1]?.status === 'rejected').length})`}
            </button>
          ))}
        </div>

        {/* Tasks List */}
        <div className="grid gap-4">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <FaClipboard className="text-4xl text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No tasks found</p>
            </div>
          ) : (
            filteredTasks.map((task, index) => {
              const lastExtension = task.extensionRequests && task.extensionRequests.length > 0
                ? task.extensionRequests[task.extensionRequests.length - 1]
                : null;

              return (
                <div 
                  key={task._id}
                  onClick={() => {
                    if (onTaskClick) {
                      onTaskClick(task._id);
                    } else {
                      setSelectedTask(selectedTask?._id === task._id ? null : task);
                    }
                  }}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer border-l-4 border-blue-500 overflow-hidden"
                >
                  {/* Task Header */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{task.title}</h3>
                        <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Assigned To</p>
                            <p className="text-sm font-bold text-gray-800 flex items-center gap-1 mt-1">
                              <FaUser size={12} /> {task.assignedToContact || 'Unassigned'}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Contact</p>
                            <p className="text-sm font-bold text-gray-800 flex items-center gap-1 mt-1">
                              <FaPhone size={12} /> {getContactPhone(task.assignedToContact)}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Status</p>
                            <div className="mt-1">
                              {getStatusBadge(task.status)}
                            </div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Due Date</p>
                            <p className="text-sm font-bold text-gray-800 mt-1">
                              {new Date(task.dueDate).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">🏢 {task.sector}</span>
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">📁 {task.category || 'N/A'}</span>
                          {task.priority && <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            task.priority === 'High' ? 'bg-red-100 text-red-700' :
                            task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>🎯 {task.priority} Priority</span>}
                        </div>
                      </div>

                      <div className="ml-4">
                        <span className="text-2xl">
                          {selectedTask?._id === task._id ? '▼' : '▶'}
                        </span>
                      </div>
                    </div>

                    {/* Extension Request Status */}
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Last Extension Request</p>
                      <div>
                        {getExtensionStatusBadge(task.extensionRequests)}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedTask?._id === task._id && lastExtension && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-t border-blue-200">
                      <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <FaClipboard /> Extension Request Details
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-lg border border-blue-200">
                          <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-2">Status</p>
                          <p className="text-lg font-bold capitalize">
                            {getExtensionStatusBadge(task.extensionRequests)}
                          </p>
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-blue-200">
                          <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-2">Requested On</p>
                          <p className="text-lg font-bold text-gray-800">
                            {new Date(lastExtension.requestedAt).toLocaleDateString('en-IN')}
                          </p>
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-blue-200 md:col-span-2">
                          <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-2">Message</p>
                          <p className="text-gray-800 italic">"{lastExtension.message}"</p>
                        </div>

                        {lastExtension.requestedDeadlineExtension && (
                          <div className="bg-white p-4 rounded-lg border border-blue-200">
                            <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-2">Requested Deadline</p>
                            <p className="text-lg font-bold text-gray-800">
                              {new Date(lastExtension.requestedDeadlineExtension).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                        )}

                        {lastExtension.status === 'approved' && (
                          <>
                            <div className="bg-green-50 p-4 rounded-lg border border-green-300">
                              <p className="text-xs text-green-700 uppercase tracking-wide font-semibold mb-2">✅ Approved On</p>
                              <p className="text-lg font-bold text-green-800">
                                {new Date(lastExtension.approvedAt).toLocaleDateString('en-IN')}
                              </p>
                            </div>

                            {lastExtension.approvedDeadline && (
                              <div className="bg-green-50 p-4 rounded-lg border border-green-300">
                                <p className="text-xs text-green-700 uppercase tracking-wide font-semibold mb-2">New Deadline</p>
                                <p className="text-lg font-bold text-green-800">
                                  {new Date(lastExtension.approvedDeadline).toLocaleDateString('en-IN')}
                                </p>
                              </div>
                            )}

                            {lastExtension.approvalNote && (
                              <div className="bg-green-50 p-4 rounded-lg border border-green-300 md:col-span-2">
                                <p className="text-xs text-green-700 uppercase tracking-wide font-semibold mb-2">Admin Notes</p>
                                <p className="text-gray-800">{lastExtension.approvalNote}</p>
                              </div>
                            )}
                          </>
                        )}

                        {lastExtension.status === 'rejected' && (
                          <>
                            <div className="bg-red-50 p-4 rounded-lg border border-red-300">
                              <p className="text-xs text-red-700 uppercase tracking-wide font-semibold mb-2">❌ Rejected On</p>
                              <p className="text-lg font-bold text-red-800">
                                {new Date(lastExtension.rejectedAt).toLocaleDateString('en-IN')}
                              </p>
                            </div>

                            {lastExtension.rejectionReason && (
                              <div className="bg-red-50 p-4 rounded-lg border border-red-300 md:col-span-2">
                                <p className="text-xs text-red-700 uppercase tracking-wide font-semibold mb-2">Reason</p>
                                <p className="text-gray-800">{lastExtension.rejectionReason}</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default TaskHistory;
