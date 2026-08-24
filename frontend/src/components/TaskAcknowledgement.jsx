import React, { useEffect, useState } from 'react';
import { FaCheck, FaExclamationTriangle, FaArrowLeft, FaEnvelope, FaCheckCircle, FaTimes, FaInfo } from 'react-icons/fa';
import { getAPIBaseURL, getPhotoUrl } from '../api';

function TaskAcknowledgement() {
  // Extract taskId and token from URL (handles basepath /Dr.Meghana/acknowledge/taskId/token)
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const ackIndex = pathParts.indexOf('acknowledge');
  const taskId = ackIndex !== -1 ? pathParts[ackIndex + 1] : pathParts[1];
  const token = ackIndex !== -1 ? pathParts[ackIndex + 2] : pathParts[2];
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [extensionMessage, setExtensionMessage] = useState('');
  const [proposedDeadline, setProposedDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedAction, setSelectedAction] = useState(null); // 'extension' or 'complete'
  const [extensionStatus, setExtensionStatus] = useState(null); // Track extension request status
  const [extensionStatusLoading, setExtensionStatusLoading] = useState(false);
  const [taskProgress, setTaskProgress] = useState(null); // Track task progress: null, 'in-progress', '50-percent', 'completed'

  useEffect(() => {
    console.log('🚀 TaskAcknowledgement component mounted');
    console.log('📌 URL Path:', window.location.pathname);
    console.log('📌 Task ID:', taskId);
    console.log('📌 Token:', token);
    fetchTaskDetails();
  }, [token]);

  const fetchExtensionStatus = async () => {
    try {
      setExtensionStatusLoading(true);
      const apiBaseURL = getAPIBaseURL();
      
      const apiUrl = `${apiBaseURL}/tasks/${taskId}/extension-status/${token}`;
      console.log('🔄 Fetching extension status from:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (response.ok && response.status !== 204) {
        const data = await response.json();
        console.log('✅ Extension status received:', data);
        setExtensionStatus(data);
      }
      // 204 = no content (no extension requests yet) - that's okay
    } catch (err) {
      console.error('⚠️ Error fetching extension status:', err);
      // Silently fail - this is optional data, page should still work without it
    } finally {
      setExtensionStatusLoading(false);
    }
  };

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      const apiBaseURL = getAPIBaseURL();
      
      const apiUrl = `${apiBaseURL}/tasks/acknowledge/${token}`;
      console.log('🔄 Fetching task from:', apiUrl);
      console.log('📌 Token:', token);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const text = await response.text();
        console.error('❌ API Error Response:', text);
        
        if (response.status === 404) {
          setError('Invalid acknowledgement link. Task not found.');
        } else {
          try {
            const errorData = JSON.parse(text);
            setError(errorData.message || `Failed to load task (Error: ${response.status})`);
          } catch {
            setError(`Server error: ${response.status}`);
          }
        }
        return;
      }

      const data = await response.json();
      console.log('✅ Task data received:', data);
      
      setTask(data);
      // Do NOT pre-fill proposed deadline - user should choose a DIFFERENT date
      setProposedDeadline(''); // Empty, force user to select a new date
      setError('');
      
      // Fetch extension status for this task
      await fetchExtensionStatus();
    } catch (err) {
      console.error('❌ Error fetching task:', err);
      setError('Failed to connect to server. Please try again or check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitExtensionRequest = async () => {
    try {
      if (!extensionMessage.trim()) {
        setError('Please enter a message');
        return;
      }

      if (!proposedDeadline) {
        setError('Please enter a new proposed deadline');
        return;
      }

      const currentDeadlineDate = new Date(task.dueDate).toISOString().split('T')[0];
      const proposedDate = proposedDeadline;
      
      if (proposedDate <= currentDeadlineDate) {
        setError('⚠️ Proposed deadline must be AFTER the current deadline. Please select a later date.');
        return;
      }

      setSubmitting(true);
      setError('');
      setSuccessMessage('');

      const apiBaseURL = getAPIBaseURL();

      const response = await fetch(`${apiBaseURL}/tasks/${taskId}/extension-request/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: extensionMessage,
          requestedDeadline: proposedDeadline ? new Date(proposedDeadline).toISOString() : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to submit extension request');
        return;
      }

      const data = await response.json();
      setSuccessMessage('✅ Extension request sent to admin! They will review and respond soon.');
      setExtensionMessage('');
      setProposedDeadline(''); // Clear field for next use
    } catch (err) {
      console.error('Error submitting extension request:', err);
      setError('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkComplete = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccessMessage('');

      const apiBaseURL = getAPIBaseURL();

      const apiUrl = `${apiBaseURL}/tasks/acknowledge/${token}/complete`;
      console.log('🔄 Marking task complete at:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Mark complete response status:', response.status);

      if (!response.ok) {
        const text = await response.text();
        console.error('❌ Mark complete error:', text);
        try {
          const errorData = JSON.parse(text);
          setError(errorData.message || 'Failed to mark task as complete');
        } catch {
          setError(`Error marking complete: ${response.status}`);
        }
        return;
      }

      const data = await response.json();
      console.log('✅ Task marked complete:', data);
      setSuccessMessage('✅ Task marked as complete! Thank you for finishing this task.');
      setTask({ ...task, status: 'Completed' });
    } catch (err) {
      console.error('❌ Error marking task complete:', err);
      setError('Failed to mark task as complete. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTaskProgress = async (progress) => {
    try {
      setSubmitting(true);
      setError('');
      setSuccessMessage('');

      const apiBaseURL = getAPIBaseURL();

      const response = await fetch(`${apiBaseURL}/tasks/acknowledge/${token}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ progress }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update progress');
        return;
      }

      setTaskProgress(progress);
      const progressText = progress === 'in-progress' ? 'In Progress' : progress === '50-percent' ? '50% Complete' : 'Completed';
      setSuccessMessage(`✅ Task marked as ${progressText}!`);
    } catch (err) {
      console.error('Error updating task progress:', err);
      setError('Failed to update progress. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="inline-block">
            <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-600 font-semibold">Loading task details...</p>
        </div>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <FaExclamationTriangle className="text-4xl text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">⚠️ Error Loading Task</h2>
          <p className="text-gray-600 mb-4 font-mono text-sm bg-red-50 p-3 rounded">{error}</p>
          <p className="text-gray-500 text-xs mb-4">
            <strong>Debug Info:</strong><br/>
            Token: {token ? token.substring(0, 20) + '...' : 'None'}<br/>
            Task ID: {taskId}<br/>
            API: getAPIBaseURL()
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            <FaArrowLeft /> Go Back
          </a>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <p className="text-gray-600">No task information available</p>
        </div>
      </div>
    );
  }

  const normalizedStatus = String(task.status || '').toLowerCase();
  const isCompleted = normalizedStatus === 'completed';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Task Update Portal</h1>
          <p className="text-gray-600">Mark your task as complete or request more time in one place</p>
        </div>

        {/* Primary Action Panel */}
        <div className={`mb-8 p-6 rounded-xl shadow-lg border ${isCompleted ? 'bg-green-600 border-green-500' : 'bg-gradient-to-r from-emerald-600 to-green-600 border-emerald-500'}`}>
          <h3 className="text-2xl font-bold text-white mb-3 text-center">
            {isCompleted ? 'Task Completed' : 'Quick Actions'}
          </h3>
          <p className="text-center text-emerald-50 mb-4">
            {isCompleted ? 'Thanks! This task has already been completed.' : 'Choose what you want to do for this task'}
          </p>

          {!isCompleted ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={handleMarkComplete}
                disabled={submitting}
                className="w-full px-6 py-4 rounded-lg font-bold text-lg bg-white text-emerald-700 hover:bg-emerald-50 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? '⏳ Marking...' : '✅ Mark Task as Complete'}
              </button>
              <button
                onClick={() => setSelectedAction('extension')}
                disabled={submitting}
                className="w-full px-6 py-4 rounded-lg font-bold text-lg bg-emerald-800 text-white hover:bg-emerald-900 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                📨 Request Extension
              </button>
            </div>
          ) : (
            <p className="text-center text-white font-semibold">✅ This task is already marked as completed.</p>
          )}
        </div>

        {/* Task Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          {/* Status Banner */}
          <div className={`px-6 py-4 ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}>
            <p className="text-white font-semibold text-lg">
              Status: {task.status}
            </p>
          </div>

          {isCompleted && (
            <div className="mx-6 mt-4 p-4 rounded-lg border border-green-300 bg-green-50">
              <p className="text-green-700 font-bold text-center">✅ This task is completed</p>
            </div>
          )}

          {/* Task Details */}
          <div className="p-8">
            {/* Priority Badge */}
            <div className="mb-4 inline-block">
              <span className={`px-4 py-2 rounded-full text-white font-semibold text-sm ${
                task.priority === 'High' ? 'bg-red-500' :
                task.priority === 'Medium' ? 'bg-yellow-500' :
                'bg-green-500'
              }`}>
                🎯 {task.priority} Priority
              </span>
            </div>

            {/* Title */}
            <h2 className="text-3xl font-bold text-gray-800 mb-4">{task.title}</h2>

            {/* Description */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Description</h3>
              <p className="text-gray-700 leading-relaxed">{task.description}</p>
            </div>

            {/* Task Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">Sector</p>
                <p className="text-lg text-gray-800 font-semibold">{task.sector}</p>
              </div>
              <div className="p-4 bg-indigo-50 rounded-lg border-2 border-indigo-300">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">📅 Original Deadline</p>
                <p className="text-lg text-gray-800 font-bold text-indigo-700">
                  {new Date(task.dueDate).toLocaleDateString('en-IN', { 
                    weekday: 'short', 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              {task.assignedToContact && (
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">Assigned To</p>
                  <p className="text-lg text-gray-800 font-semibold">{task.assignedToContact}</p>
                </div>
              )}
              <div className="p-4 bg-pink-50 rounded-lg">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">Category</p>
                <p className="text-lg text-gray-800 font-semibold">{task.category || 'N/A'}</p>
              </div>
            </div>

            {/* Photo if available */}
            {task.photo && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Attached Photo</p>
                <img 
                  src={getPhotoUrl(task.photo)} 
                  alt="Task" 
                  className="w-full max-h-80 object-cover rounded-lg border-2 border-gray-200"
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                <p className="text-red-700 font-semibold">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded">
                <p className="text-green-700 font-semibold text-lg">{successMessage}</p>
              </div>
            )}

            {/* Extension Status Section */}
            {extensionStatus && (
              <>
                {extensionStatus.status === 'rejected' && (
                  <div className="mb-6 p-6 bg-red-50 border-2 border-red-300 rounded-lg">
                    <div className="flex items-start gap-4">
                      <FaTimes className="text-3xl text-red-600 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-red-800 mb-3">❌ Extension Request Rejected</h3>
                        <div className="bg-white p-4 rounded mb-4 border-l-4 border-red-500">
                          <p className="text-gray-800 mb-2"><strong>Reason:</strong></p>
                          <p className="text-gray-700 text-sm italic">{extensionStatus.rejectionReason || 'No reason provided'}</p>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                          <strong>Rejected on:</strong> {new Date(extensionStatus.rejectedAt).toLocaleDateString('en-IN', { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <p className="text-sm text-gray-700 mb-3">
                          <strong>Current Deadline:</strong> {new Date(task.dueDate).toLocaleDateString('en-IN', { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-xs text-amber-700 bg-amber-100 p-3 rounded flex items-start gap-2">
                          <FaInfo className="flex-shrink-0 mt-0.5" />
                          <span>You can submit another extension request if you still need more time.</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {extensionStatus.status === 'approved' && (
                  <div className="mb-6 p-6 bg-green-50 border-2 border-green-300 rounded-lg">
                    <div className="flex items-start gap-4">
                      <FaCheck className="text-3xl text-green-600 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-green-800 mb-3">✅ Extension Request Approved</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="bg-white p-4 rounded border-l-4 border-green-500">
                            <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-1">Original Deadline (from start)</p>
                            <p className="text-lg font-bold text-gray-800">
                              {new Date(
                                task.originalDueDate || task.dueDate
                              ).toLocaleDateString('en-IN', { 
                                weekday: 'short', 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                          <div className="bg-white p-4 rounded border-l-4 border-blue-500">
                            <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-1">New Deadline</p>
                            <p className="text-lg font-bold text-blue-700">
                              {new Date(extensionStatus.approvedDeadline).toLocaleDateString('en-IN', { 
                                weekday: 'short', 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>

                        {extensionStatus.approvalNote && (
                          <div className="bg-white p-4 rounded mb-4 border-l-4 border-blue-400">
                            <p className="text-gray-700 mb-2"><strong>Admin Notes:</strong></p>
                            <p className="text-gray-700 text-sm italic">{extensionStatus.approvalNote}</p>
                          </div>
                        )}

                        <p className="text-sm text-gray-600">
                          <strong>Approved on:</strong> {new Date(extensionStatus.approvedAt).toLocaleDateString('en-IN', { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {extensionStatus.status === 'pending' && (
                  <div className="mb-6 p-6 bg-blue-50 border-2 border-blue-300 rounded-lg">
                    <div className="flex items-start gap-4">
                      <div className="text-3xl animate-pulse">⏳</div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-blue-800 mb-2">⏸️ Extension Request Pending</h3>
                        <p className="text-gray-700 mb-2">Your extension request is currently under review by the admin.</p>
                        <p className="text-sm text-gray-600">
                          <strong>Requested on:</strong> {extensionStatus.requestedAt ? new Date(extensionStatus.requestedAt).toLocaleDateString('en-IN', { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric'
                          }) : 'Recently'}
                        </p>
                        {extensionStatus.requestedDeadline && (
                          <p className="text-sm text-gray-600">
                            <strong>Proposed Deadline:</strong> {new Date(extensionStatus.requestedDeadline).toLocaleDateString('en-IN', { 
                              weekday: 'short', 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Action Choice Section */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">What would you like to do?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Extension Request Button */}
                <button
                  onClick={() => setSelectedAction('extension')}
                  className={`p-6 rounded-lg border-2 transition-all transform hover:scale-105 ${
                    selectedAction === 'extension'
                      ? 'border-orange-500 bg-orange-50 shadow-lg'
                      : 'border-gray-300 bg-white hover:border-orange-300 hover:shadow-md'
                  }`}
                >
                  <FaEnvelope className={`text-3xl mb-3 mx-auto ${selectedAction === 'extension' ? 'text-orange-500' : 'text-gray-600'}`} />
                  <h4 className={`font-bold text-lg mb-2 ${selectedAction === 'extension' ? 'text-orange-600' : 'text-gray-800'}`}>
                    Request Extension
                  </h4>
                  <p className="text-sm text-gray-600">Need more time to complete this task?</p>
                </button>

                {/* Mark Complete Button */}
                <button
                  onClick={() => setSelectedAction('complete')}
                  className={`p-6 rounded-lg border-2 transition-all transform hover:scale-105 ${
                    selectedAction === 'complete'
                      ? 'border-green-500 bg-green-50 shadow-lg'
                      : 'border-gray-300 bg-white hover:border-green-300 hover:shadow-md'
                  }`}
                >
                  <FaCheckCircle className={`text-3xl mb-3 mx-auto ${selectedAction === 'complete' ? 'text-green-500' : 'text-gray-600'}`} />
                  <h4 className={`font-bold text-lg mb-2 ${selectedAction === 'complete' ? 'text-green-600' : 'text-gray-800'}`}>
                    Mark as Complete
                  </h4>
                  <p className="text-sm text-gray-600">Task is done? Mark it complete now!</p>
                </button>
              </div>
            </div>

            {/* Task Progress Section */}
            <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-300">
              <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">📊 Update Task Progress</h3>
              <p className="text-center text-gray-600 mb-4">Let us know how you're progressing on this task</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => handleUpdateTaskProgress('in-progress')}
                  disabled={submitting}
                  className={`px-4 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                    taskProgress === 'in-progress'
                      ? 'bg-blue-600 text-white shadow-lg scale-105'
                      : 'bg-white text-blue-600 border-2 border-blue-300 hover:bg-blue-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  🚀 In Progress
                </button>
                <button
                  onClick={() => handleUpdateTaskProgress('50-percent')}
                  disabled={submitting}
                  className={`px-4 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                    taskProgress === '50-percent'
                      ? 'bg-yellow-600 text-white shadow-lg scale-105'
                      : 'bg-white text-yellow-600 border-2 border-yellow-300 hover:bg-yellow-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  ⏳ 50% Complete
                </button>
                <button
                  onClick={() => handleUpdateTaskProgress('completed')}
                  disabled={submitting}
                  className={`px-4 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                    taskProgress === 'completed'
                      ? 'bg-green-600 text-white shadow-lg scale-105'
                      : 'bg-white text-green-600 border-2 border-green-300 hover:bg-green-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  ✅ Completed
                </button>
              </div>
              {taskProgress && (
                <p className="text-center text-sm text-gray-600 mt-3">
                  ✓ Progress updated! Admin can see this status.
                </p>
              )}
            </div>

            {/* Extension Request Form */}
            {selectedAction === 'extension' && (
              <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-6 rounded-lg border-2 border-orange-200 mb-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FaEnvelope className="text-orange-500" />
                  Request Deadline Extension
                </h3>

                {/* Message Input */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Your Message *
                  </label>
                  <textarea
                    value={extensionMessage}
                    onChange={(e) => setExtensionMessage(e.target.value)}
                    placeholder="Please explain why you need more time... (e.g., 'Waiting for client approval', 'Need additional resources', etc.)"
                    className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 resize-none text-gray-700"
                    rows="4"
                    disabled={successMessage ? true : false}
                  />
                  <p className="text-xs text-gray-500 mt-1">{extensionMessage.length} characters</p>
                </div>

                {/* Proposed Deadline */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ⏳ Proposed New Deadline *
                  </label>
                  <input
                    type="date"
                    value={proposedDeadline}
                    onChange={(e) => setProposedDeadline(e.target.value)}
                    min={new Date(new Date(task.dueDate).getTime() + 86400000).toISOString().split('T')[0]} // Minimum: tomorrow after current deadline
                    className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-gray-700"
                    disabled={successMessage ? true : false}
                  />
                  <p className="text-xs text-gray-500 mt-1">Current deadline: {new Date(task.dueDate).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} - Select a date AFTER this</p>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmitExtensionRequest}
                  disabled={submitting || successMessage ? true : false}
                  className="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed transform hover:scale-105 disabled:scale-100"
                >
                  <FaEnvelope />
                  {submitting ? 'Sending...' : 'Send Request to Admin'}
                </button>

                {successMessage && (
                  <p className="text-xs text-green-700 font-semibold mt-3 text-center">
                    ✅ Admin will review your request and get back to you soon!
                  </p>
                )}
              </div>
            )}

            {/* Info */}
            <p className="text-center text-sm text-gray-500">
              📌 This link never expires. You can use it anytime to request an extension.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskAcknowledgement;
