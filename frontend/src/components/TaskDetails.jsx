import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaUser, FaPhone, FaClock, FaCheckCircle, FaTimesCircle, FaClipboard, FaCalendarAlt, FaMapMarkerAlt } from 'react-icons/fa';
import { getAPIBaseURL } from '../api';

function TaskDetails({ taskId, onBack }) {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contactPhone, setContactPhone] = useState('N/A');

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      const adminPin = localStorage.getItem('adminPin') || '1234';
      const apiBaseURL = getAPIBaseURL();
      
      const response = await fetch(`${apiBaseURL}/tasks/${taskId}`, {
        headers: {
          'adminPin': adminPin,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTask(data);
        
        // Fetch contact phone
        if (data.assignedToContact) {
          fetchContactPhone(data.assignedToContact);
        }
      } else {
        setError('Failed to load task details');
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching task:', err);
      setError('Failed to fetch task details');
      setLoading(false);
    }
  };

  const fetchContactPhone = async (name) => {
    try {
      const adminPin = localStorage.getItem('adminPin') || '1234';
      const apiBaseURL = getAPIBaseURL();
      const response = await fetch(`${apiBaseURL}/contacts/all`, {
        headers: {
          'adminPin': adminPin,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const contacts = await response.json();
        const contact = contacts.find(c => c.name === name);
        if (contact) {
          setContactPhone(contact.phone);
        }
      }
    } catch (err) {
      console.error('Error fetching contact:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'text-yellow-700 bg-yellow-50';
      case 'In Progress':
        return 'text-blue-700 bg-blue-50';
      case 'Completed':
        return 'text-green-700 bg-green-50';
      default:
        return 'text-gray-700 bg-gray-50';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-700';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'Low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getExtensionStatusBadge = (extensionRequests) => {
    if (!extensionRequests || extensionRequests.length === 0) {
      return null;
    }

    const lastRequest = extensionRequests[extensionRequests.length - 1];
    if (lastRequest.status === 'approved') {
      return <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1"><FaCheckCircle size={11} /> Approved</span>;
    }
    if (lastRequest.status === 'rejected') {
      return <span className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-semibold flex items-center gap-1"><FaTimesCircle size={11} /> Rejected</span>;
    }
    return <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold flex items-center gap-1"><FaClock size={11} /> Pending</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading task details...</p>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-4 transition-colors"
          >
            <FaArrowLeft /> Back to History
          </button>
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded">
            <p className="text-red-700 font-semibold">{error || 'Task not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-6 transition-colors"
        >
          <FaArrowLeft /> Back to History
        </button>

        {/* Main Task Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
            <h1 className="text-4xl font-bold mb-2">{task.title}</h1>
            <p className="text-blue-100 text-lg">{task.description}</p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Status and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className={`p-4 rounded-lg ${getStatusColor(task.status)}`}>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-75">Status</p>
                <p className="text-2xl font-bold mt-2">{task.status}</p>
              </div>
              <div className={`p-4 rounded-lg ${getPriorityColor(task.priority)}`}>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-75">Priority</p>
                <p className="text-2xl font-bold mt-2">{task.priority}</p>
              </div>
            </div>

            {/* Key Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 pb-8 border-b border-gray-200">
              {/* Assigned To */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <FaUser className="text-blue-600 text-xl" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Assigned To</p>
                  <p className="text-lg font-bold text-gray-800 mt-1">{task.assignedToContact || 'Unassigned'}</p>
                </div>
              </div>

              {/* Contact Phone */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <FaPhone className="text-green-600 text-xl" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Contact Phone</p>
                  <p className="text-lg font-bold text-gray-800 mt-1">{contactPhone}</p>
                </div>
              </div>

              {/* Due Date */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <FaCalendarAlt className="text-yellow-600 text-xl" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Due Date</p>
                  <p className="text-lg font-bold text-gray-800 mt-1">
                    {new Date(task.dueDate).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Sector */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <FaMapMarkerAlt className="text-purple-600 text-xl" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Sector</p>
                  <p className="text-lg font-bold text-gray-800 mt-1">{task.sector}</p>
                </div>
              </div>
            </div>

            {/* Category */}
            {task.category && (
              <div className="mb-8 pb-8 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Category</p>
                <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
                  {task.category}
                </span>
              </div>
            )}

            {/* Extension Requests */}
            {task.extensionRequests && task.extensionRequests.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FaClipboard /> Extension Requests
                </h3>
                
                {task.extensionRequests.map((request, idx) => (
                  <div key={idx} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-4 border border-blue-200">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">Request #{task.extensionRequests.length - idx}</p>
                        <p className="text-sm text-gray-600">
                          Requested on {new Date(request.requestedAt).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      {getExtensionStatusBadge([request])}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {request.message && (
                        <div className="md:col-span-2">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Message</p>
                          <p className="text-gray-700 italic">"{request.message}"</p>
                        </div>
                      )}

                      {request.requestedDeadlineExtension && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Requested Deadline</p>
                          <p className="text-gray-800 font-semibold">
                            {new Date(request.requestedDeadlineExtension).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                      )}

                      {request.status === 'approved' && (
                        <>
                          <div className="bg-green-100 p-3 rounded">
                            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">✅ Approved On</p>
                            <p className="text-green-900 font-semibold">
                              {new Date(request.approvedAt).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                          {request.approvedDeadline && (
                            <div className="bg-green-100 p-3 rounded">
                              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">New Deadline</p>
                              <p className="text-green-900 font-semibold">
                                {new Date(request.approvedDeadline).toLocaleDateString('en-IN')}
                              </p>
                            </div>
                          )}
                          {request.approvalNote && (
                            <div className="md:col-span-2 bg-green-100 p-3 rounded">
                              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Admin Notes</p>
                              <p className="text-green-900">{request.approvalNote}</p>
                            </div>
                          )}
                        </>
                      )}

                      {request.status === 'rejected' && (
                        <>
                          <div className="bg-red-100 p-3 rounded">
                            <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">❌ Rejected On</p>
                            <p className="text-red-900 font-semibold">
                              {new Date(request.rejectedAt).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                          {request.rejectionReason && (
                            <div className="md:col-span-2 bg-red-100 p-3 rounded">
                              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Rejection Reason</p>
                              <p className="text-red-900">{request.rejectionReason}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Additional Info */}
            {task.location && (
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Location</p>
                <p className="text-gray-800">{task.location}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskDetails;
