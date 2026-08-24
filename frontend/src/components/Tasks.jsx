import React, { useEffect, useState } from 'react';
import { FaPlus, FaTrash, FaPlay, FaCheck, FaShare, FaUsers, FaTimes, FaPhone, FaEdit } from 'react-icons/fa';
import { tasksAPI, whatsappAPI, settingsAPI, getPhotoUrl, getAPIBaseURL } from '../api';
import TaskForm from './TaskForm';
import TaskCard from './TaskCard';
import SessionTimer from './SessionTimer';

function Tasks({ adminPin, selectedAssignee, selectedStatus, selectedSector: selectedSectorProp }) {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedSectorLocal, setSelectedSectorLocal] = useState(selectedSectorProp || 'all');
  const [selectedStatusLocal, setSelectedStatusLocal] = useState(selectedStatus || 'all');
  const [sectors, setSectors] = useState([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [editableMessage, setEditableMessage] = useState('');
  const [selectedPhoneForMessage, setSelectedPhoneForMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedTaskForMessage, setSelectedTaskForMessage] = useState(null);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [taskStartTime, setTaskStartTime] = useState(null);
  const [showAcknowledgementModal, setShowAcknowledgementModal] = useState(false);
  const [acknowledgementLink, setAcknowledgementLink] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);

  // Sync selectedStatusLocal with selectedStatus prop
  useEffect(() => {
    if (selectedStatus) {
      setSelectedStatusLocal(selectedStatus);
    }
  }, [selectedStatus]);

  // Sync selectedSectorLocal with selectedSectorProp
  useEffect(() => {
    if (selectedSectorProp) {
      setSelectedSectorLocal(selectedSectorProp);
    }
  }, [selectedSectorProp]);

  useEffect(() => {
    async function loadSectors() {
      try {
        const response = await settingsAPI.getSettings();
        if (response.data && response.data.sectors) {
          setSectors(response.data.sectors);
        }
      } catch (err) {
        console.error('Failed to load sectors', err);
      }
    }
    loadSectors();
  }, []);

  useEffect(() => {
    loadTasks();
    // Load tasks only when dependencies change - no auto-refresh to prevent excessive reloading
  }, [adminPin, selectedSectorLocal]);

  useEffect(() => {
    filterTasks();
  }, [tasks, selectedStatusLocal, selectedAssignee]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      let response;
      if (selectedSectorLocal === 'all') {
        response = await tasksAPI.getAllTasks();
      } else {
        response = await tasksAPI.getTasksBySector(selectedSectorLocal);
      }
      setTasks(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load tasks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filterTasks = () => {
    let filtered = tasks;
    
    // Filter by assignee if selectedAssignee is set
    // Check both assignedToContact (main field) and assignedTo (secondary field)
    if (selectedAssignee) {
      filtered = filtered.filter((task) => 
        task.assignedToContact === selectedAssignee || task.assignedTo === selectedAssignee
      );
    }
    
    // Filter by status
    if (selectedStatusLocal !== 'all') {
      filtered = filtered.filter((task) => task.status === selectedStatusLocal);
    }
    
    setFilteredTasks(filtered);
  };

  const handleCreateTask = async (formData) => {
    try {
      const apiBaseURL = getAPIBaseURL();
      
      let response;
      
      if (formData.photo && formData.photo instanceof File) {
        // Use FormData for file uploads
        const fd = new FormData();
        
        // Append all form data
        fd.append('title', formData.title);
        fd.append('description', formData.description);
        fd.append('priority', formData.priority);
        fd.append('category', formData.category);
        fd.append('sector', formData.sector);
        fd.append('dueDate', formData.dueDate);
        fd.append('referencePhone', formData.referencePhone);
        fd.append('referenceNumber', formData.referenceNumber);
        fd.append('assignedToContactId', formData.assignedToContactId);
        fd.append('assignedToContact', formData.assignedToContact);
        fd.append('photo', formData.photo); // Append the file
        
        if (editingTask) {
          response = await fetch(`${apiBaseURL}/tasks/update/${editingTask._id}`, {
            method: 'PUT',
            headers: {
              'adminPin': pin,
            },
            body: fd,
          });
        } else {
          response = await fetch(`${apiBaseURL}/tasks/create`, {
            method: 'POST',
            headers: {
              'adminPin': pin,
            },
            body: fd,
          });
        }
      } else {
        // Use JSON for requests without files
        if (editingTask) {
          const updateData = {...formData};
          if (updateData.photo === null) {
            delete updateData.photo;
          }
          await tasksAPI.updateTask(editingTask._id, updateData);
          setSuccessMessage('Task updated successfully');
          setEditingTask(null);
        } else {
          await tasksAPI.createTask(formData);
          setSuccessMessage('Task created successfully');
        }
      }
      
      if (formData.photo && formData.photo instanceof File) {
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }
        
        setSuccessMessage(editingTask ? 'Task updated successfully' : 'Task created successfully');
        setEditingTask(null);
      }
      
      setShowForm(false);
      loadTasks();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save task');
      console.error('Task creation error:', err);
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleStartTask = async (taskId) => {
    try {
      setActiveTaskId(taskId);
      setTaskStartTime(Date.now());
      await tasksAPI.updateTask(taskId, { status: 'In Progress' });
      loadTasks();
      setSuccessMessage('Task started - Timer is running');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to start task');
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      if (activeTaskId === taskId) {
        setActiveTaskId(null);
        setTaskStartTime(null);
      }
      await tasksAPI.updateTask(taskId, { status: 'Completed' });
      loadTasks();
      setSuccessMessage('Task completed');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to complete task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await tasksAPI.deleteTask(taskId);
        loadTasks();
        setSuccessMessage('Task deleted successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (err) {
        setError('Failed to delete task');
      }
    }
  };

  // NEW: Handle Citizen Notification
  const handleCitizenNotification = (task) => {
    if (!task.referenceNumber) {
      setError('Citizen phone number is required for citizen notification.');
      return;
    }

    // Create formal grievance/task update message
    let citizenMessage = `📋 *GRIEVANCE UPDATE*

*Reference #:* ${task.referenceNumber}

*Subject:* ${task.title}

*Description:* ${task.description}

*Status:* Your grievance/task has been ${task.status === 'Completed' ? 'resolved' : 'updated'}. Please verify and let us know if you need any further assistance.

*Sector:* ${task.sector}
*Priority:* ${task.priority}
*Due Date:* ${new Date(task.dueDate).toLocaleDateString()}

Thank you for your patience. For any queries, please contact us.`;

    // Show message preview modal for citizen notification
    setEditableMessage(citizenMessage);
    setSelectedPhoneForMessage(task.referenceNumber);
    setShowMessageModal(true);
  };

  // NEW: Handle automatic Assign button click
  const handleAssignClick = async (task) => {
    try {
      setGeneratingLink(true);
      const pin = localStorage.getItem('adminPin');
      const apiBaseURL = getAPIBaseURL();

      // Get phone number from task or fetch from contacts
      let phoneNumber = task.assignedToPhone;
      
      // If no phone stored, extract from assignedToContact (format: "Name (+919900842064)")
      if (!phoneNumber && task.assignedToContact) {
        // Try to extract phone number enclosed in parentheses
        const phoneMatch = task.assignedToContact.match(/\(\+[\d\s\-]+\)/);
        if (phoneMatch) {
          // Remove all non-digit characters but keep the +
          phoneNumber = phoneMatch[0].replace(/[^\d+]/g, '');
        } else {
          // Fallback: if format is different, try to fetch from contacts endpoint
          try {
            const contactsResponse = await fetch(`${apiBaseURL}/contacts/all`, {
              headers: { 'adminPin': pin }
            });
            if (contactsResponse.ok) {
              const contacts = await contactsResponse.json();
              const matched = contacts.find(c => 
                c.name && task.assignedToContact && 
                (c.name === task.assignedToContact || 
                 task.assignedToContact.includes(c.name))
              );
              if (matched && matched.phone) {
                phoneNumber = matched.phone.replace(/[^\d+]/g, '');
              }
            }
          } catch (err) {
            console.warn('Could not fetch contacts:', err);
          }
        }
      }
      
      console.log('Debug: assignedToContact =', task.assignedToContact);
      console.log('Debug: Final phoneNumber =', phoneNumber);

      const response = await fetch(`${apiBaseURL}/tasks/${task._id}/acknowledge-link`, {
        method: 'POST',
        headers: {
          'adminPin': pin,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        setError('Failed to generate acknowledgement link');
        return;
      }

      const data = await response.json();
      const acknowledgementUrl = data.acknowledgementUrl;
      setAcknowledgementLink(acknowledgementUrl);
      setSelectedTaskForMessage(task);

      // Create WhatsApp message with the acknowledgement link + photo
      let assignMessage = `✅ *TASK ASSIGNED*

*Task:* ${task.title}
${task.referenceNumber ? `*Reference #:* ${task.referenceNumber}
` : ''}
*Description:* ${task.description}

*Status:* ${task.status}
*Priority:* ${task.priority}
*Due Date:* ${new Date(task.dueDate).toLocaleDateString()}
*Sector:* ${task.sector}`;

      // Add photo URL if task has photo
      if (task.photo) {
        const photoUrl = getPhotoUrl(task.photo);
        assignMessage += `

📸 *TASK PHOTO:*
${photoUrl}`;
      }

      assignMessage += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ *TAP LINK BELOW TO CONFIRM TASK:*
${acknowledgementUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${task.assignedToContact ? `*Assigned to:* ${task.assignedToContact}` : ''}

Thank you!`;

      // Set message and phone - use assigned contact's phone if available
      setEditableMessage(assignMessage);
      setSelectedPhoneForMessage(phoneNumber || '');
      setShowMessageModal(true);

      const statusMsg = phoneNumber 
        ? `✅ Ready to send to ${task.assignedToContact}!`
        : `⚠️ Please enter phone number to send...`;
      setSuccessMessage(statusMsg);
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to prepare message. Please try again.');
    } finally {
      setGeneratingLink(false);
    }
  };

  // Generate acknowledgement link
  const generateAcknowledgementLink = async (task) => {
    try {
      setGeneratingLink(true);
      const pin = localStorage.getItem('adminPin');
      const apiBaseURL = getAPIBaseURL();

      const response = await fetch(`${apiBaseURL}/tasks/${task._id}/acknowledge-link`, {
        method: 'POST',
        headers: {
          'adminPin': pin,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        setError('Failed to regenerate link');
        return;
      }

      const data = await response.json();
      setAcknowledgementLink(data.acknowledgementUrl);
      setSuccessMessage('✅ Link regenerated!');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (err) {
      console.error('Error regenerating link:', err);
      setError('Failed to regenerate link');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleOpenWhatsApp = (phoneNumber, taskId) => {
    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;

    // Format message with task details + image link
    let message = `📌 *TASK UPDATE*

*Task:* ${task.title}
${task.referenceNumber ? `*Reference #:* ${task.referenceNumber}
` : ''}
*Description:* ${task.description}

*Assigned To:* ${task.assignedToContact || 'To be assigned'}
*Status:* ${task.status}
*Priority:* ${task.priority}
*Due Date:* ${new Date(task.dueDate).toLocaleDateString()}
*Sector:* ${task.sector}`;

    // Add photo URL if task has photo - cloud link works directly, no manual steps needed
    if (task.photo) {
      const photoUrl = getPhotoUrl(task.photo);
      message += `

📸 *TASK PHOTO:*
${photoUrl}`;
    }

    // Store task with processed photo URL
    setSelectedTaskForMessage({ ...task, processedPhotoUrl: task.photo ? getPhotoUrl(task.photo) : null });
    setEditableMessage(message);
    setSelectedPhoneForMessage(phoneNumber);
    setShowMessageModal(true);
  };

  const handleSendWhatsApp = () => {
    // Validate phone number
    if (!selectedPhoneForMessage || selectedPhoneForMessage.trim() === '') {
      setError('❌ Please enter a WhatsApp number first!');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setIsSending(true);
    
    // Show sending feedback
    setSuccessMessage('📱 Opening WhatsApp with your message...');
    
    // Small delay to show the status message
    setTimeout(() => {
      const whatsappUrl = `https://wa.me/${selectedPhoneForMessage}?text=${encodeURIComponent(editableMessage)}`;
      window.open(whatsappUrl, '_blank');
      
      setShowMessageModal(false);
      setSelectedTaskForMessage(null);
      setIsSending(false);
      
      // Show confirmation that WhatsApp was opened
      setSuccessMessage('✓ WhatsApp opened! Your message is ready to send. Attach the image manually in WhatsApp.');
      setTimeout(() => setSuccessMessage(''), 5000);
    }, 500);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editableMessage);
    setSuccessMessage('Message copied to clipboard!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Tasks Management</h2>
          {selectedAssignee && (
            <p className="text-lg text-blue-600 font-semibold mt-2">
              📌 Showing tasks for: <span className="text-indigo-700">{selectedAssignee}</span>
            </p>
          )}
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          <FaPlus /> {showForm ? 'Cancel' : 'Create New Task'}
        </button>
      </div>

      {error && (
        <div className="error-message mb-6">
          {error}
          <button onClick={() => setError('')} className="ml-auto text-xl">&times;</button>
        </div>
      )}

      {successMessage && (
        <div className="success-message mb-6">
          {successMessage}
          <button onClick={() => setSuccessMessage('')} className="ml-auto text-xl">&times;</button>
        </div>
      )}

      {showForm && (
        <TaskForm
          editingTask={editingTask}
          onSubmit={handleCreateTask}
          onCancel={() => {
            setShowForm(false);
            setEditingTask(null);
          }}
        />
      )}

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={selectedSectorLocal}
          onChange={(e) => setSelectedSectorLocal(e.target.value)}
          className="form-select"
        >
          <option value="all">All Sectors</option>
          {sectors.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={selectedStatusLocal}
          onChange={(e) => setSelectedStatusLocal(e.target.value)}
          className="form-select"
        >
          <option value="all">All Status</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {/* Active Task Timer */}
      {activeTaskId && (
        <div className="mb-6">
          {filteredTasks.map((task) =>
            task._id === activeTaskId ? (
              <div key={task._id}>
                <p className="text-sm font-semibold text-gray-700 mb-3">Currently Working On: <span className="text-blue-600">{task.title}</span></p>
                <SessionTimer isRunning={true} startTime={taskStartTime} />
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Tasks List */}
      {loading ? (
        <p className="text-center text-gray-500">Loading tasks...</p>
      ) : filteredTasks.length === 0 ? (
        <p className="text-center text-gray-500">No tasks found</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onStart={handleStartTask}
              onComplete={handleCompleteTask}
              onDelete={handleDeleteTask}
              onAssign={handleAssignClick}
              onCitizen={handleCitizenNotification}
              onEdit={handleEditTask}
              isActive={activeTaskId === task._id}
            />
          ))}
        </div>
      )}

      {/* Message Preview & Edit Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-screen overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 flex justify-between items-center p-6 border-b-2 border-gray-200 bg-gradient-to-r from-green-50 to-primary-50">
              <div className="flex items-center gap-3">
                <div className="text-3xl">💬</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">WhatsApp Message</h3>
                  <p className="text-sm text-gray-600">Edit your message before sending</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowMessageModal(false);
                  setSelectedTaskForMessage(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FaTimes className="text-xl text-gray-600" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Phone Input if not set */}
              {!selectedPhoneForMessage || selectedPhoneForMessage.trim() === '' ? (
                <div className="bg-yellow-50 border-2 border-yellow-300 p-4 rounded-lg">
                  <label className="block text-sm font-bold text-yellow-900 mb-2">
                    📱 WhatsApp Number (Required)
                  </label>
                  <input
                    type="tel"
                    value={selectedPhoneForMessage}
                    onChange={(e) => setSelectedPhoneForMessage(e.target.value)}
                    placeholder="+919876543210"
                    className="w-full px-4 py-2 border-2 border-yellow-300 rounded-lg focus:border-green-600 focus:outline-none text-gray-800 font-medium"
                    autoFocus
                  />
                  <p className="text-xs text-yellow-800 mt-2">
                    💡 Include country code (e.g., +91 for India, +1 for USA)
                  </p>
                </div>
              ) : (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                  <p className="text-sm font-semibold text-green-900">
                    📱 Sending to: <span className="text-lg font-bold">{selectedPhoneForMessage}</span>
                  </p>
                </div>
              )}

              {/* Task Image Preview (if exists) */}
              {selectedTaskForMessage?.processedPhotoUrl && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">📎 Task Photo</p>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <img
                      src={selectedTaskForMessage.processedPhotoUrl}
                      alt="Task"
                      className="w-full max-h-40 object-cover rounded-lg"
                      onError={(e) => {
                        console.error('Photo preview failed to load:', selectedTaskForMessage.processedPhotoUrl);
                        e.target.src = 'https://via.placeholder.com/400x200?text=Photo+Not+Found';
                      }}
                    />
                  </div>
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                    <p className="text-xs font-semibold text-blue-900">
                      💡 <strong>How to attach image to WhatsApp:</strong>
                    </p>
                    <ol className="text-xs text-blue-800 mt-2 space-y-1 ml-4 list-decimal">
                      <li>After clicking "Send via WhatsApp", the chat window will open</li>
                      <li>Inside WhatsApp, click the <strong>📎 Attachment</strong> button (paperclip icon)</li>
                      <li>Select <strong>Photos & Videos</strong></li>
                      <li>Choose the image and send</li>
                      <li>Or copy the message and paste it first, then attach the image</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Editable Message Box */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Message Preview & Edit
                </label>
                <textarea
                  value={editableMessage}
                  onChange={(e) => setEditableMessage(e.target.value)}
                  className="w-full h-56 p-4 border-2 border-gray-300 rounded-xl font-mono text-sm leading-relaxed focus:border-primary-500 focus:outline-none resize-none"
                  placeholder="Edit your message here..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  Character count: {editableMessage.length}
                </p>
              </div>

              {/* Preview as it appears in WhatsApp */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-2">PREVIEW IN WHATSAPP:</p>
                <div className="bg-white p-3 rounded border-l-4 border-green-500 whitespace-pre-wrap text-sm text-gray-800 font-sans break-words">
                  {editableMessage}
                </div>
              </div>
            </div>

            {/* Modal Footer / Actions */}
            <div className="sticky bottom-0 p-6 border-t-2 border-gray-200 bg-gray-50 flex gap-3">
              <button
                onClick={copyToClipboard}
                disabled={isSending}
                className="flex-1 px-4 py-3 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed text-gray-800 font-semibold rounded-lg transition-colors"
              >
                📋 Copy Message
              </button>
              <button
                onClick={() => {
                  setShowMessageModal(false);
                  setSelectedTaskForMessage(null);
                }}
                disabled={isSending}
                className="flex-1 px-4 py-3 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendWhatsApp}
                disabled={isSending}
                className={`flex-1 px-4 py-3 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  isSending
                    ? 'bg-green-300 cursor-not-allowed text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {isSending ? (
                  <>
                    <span className="animate-spin">⏳</span> Sending...
                  </>
                ) : (
                  <>
                    ✓ Send via WhatsApp
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tasks;
