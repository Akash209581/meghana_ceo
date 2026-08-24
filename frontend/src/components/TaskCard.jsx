import React, { useState } from 'react';
import { FaPlay, FaCheckCircle, FaTrash, FaBell, FaPhone, FaClock, FaShare, FaEdit } from 'react-icons/fa';
import SessionTimer from './SessionTimer';
import { getPhotoUrl } from '../api';

function TaskCard({ task, onStart, onComplete, onDelete, onCitizen, onAssign, onEdit, isActive }) {
  const [showTimer, setShowTimer] = useState(isActive);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 border-l-4 border-green-600';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border-l-4 border-blue-600';
      default:
        return 'bg-yellow-100 text-yellow-800 border-l-4 border-yellow-600';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      Request: '📋',
      Meeting: '📞',
      Appointment: '📅',
      Other: '📝',
    };
    return icons[category] || '📝';
  };

  const getSectorIcon = (sector) => {
    return sector.includes('Vignan') ? '🎓' : '🏢';
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      onClick={() => onEdit && onEdit(task)}
      className={`rounded-lg shadow-lg overflow-hidden transition-transform hover:shadow-xl hover:scale-105 cursor-pointer ${getStatusColor(task.status)}`}
      title="Click to edit task">
      {/* Card Header */}
      <div className="p-6 bg-white border-b-2">
        {/* Title & Status Row */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">{task.title}</h3>
            <p className="text-gray-600 text-sm mt-1">{task.description}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ml-2 ${getPriorityBadge(task.priority)}`}>
            {task.priority === 'High' && '🔴'}
            {task.priority === 'Medium' && '🟡'}
            {task.priority === 'Low' && '🟢'}
            {task.priority}
          </span>
        </div>

        {/* Reference Number (if exists) */}
        {task.referenceNumber && (
          <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-xs font-bold text-purple-900">📌 Reference: <span className="font-mono font-bold">{task.referenceNumber}</span></p>
          </div>
        )}

        {/* Metadata Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-semibold">
          <div className="flex items-center gap-2 text-gray-700">
            <span>{getCategoryIcon(task.category)}</span>
            <span>{task.category}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <span>{getSectorIcon(task.sector)}</span>
            <span className="truncate">{task.sector}</span>
          </div>
          <div className="flex items-center gap-2 text-blue-700">
            <FaClock className="text-sm" />
            <span>{formatDate(task.dueDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <span>📊</span>
            <span className="px-2 py-1 bg-gray-200 rounded">{task.status}</span>
          </div>
        </div>
      </div>

      {/* Photo Section */}
      {task.photo && (
        <div className="px-6 py-3 bg-gray-50 border-b">
          <img
            src={getPhotoUrl(task.photo)}
            alt={task.title}
            className="w-full h-40 object-cover rounded-lg"
            onError={(e) => {
              console.error('Image failed to load:', task.photo);
              e.target.src = 'https://via.placeholder.com/300x200?text=Photo+Not+Found';
            }}
          />
        </div>
      )}

      {/* Assigned Contact Section */}
      {task.assignedToContact && (
        <div className="px-6 py-3 bg-indigo-50 border-b">
          <p className="text-xs font-bold text-indigo-900 mb-1">👤 Assigned To:</p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-indigo-900">{task.assignedToContact}</span>
            {task.referencePhone && (
              <a
                href={`tel:${task.referencePhone}`}
                className="flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold text-sm"
              >
                <FaPhone className="text-sm" />
                {task.referencePhone}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Timer Section (Only show if active) */}
      {isActive && task.status === 'In Progress' && (
        <div className="px-6 py-4 bg-blue-50 border-b">
          <SessionTimer
            isRunning={isActive}
            startTime={task.startTime ? new Date(task.startTime).getTime() : Date.now()}
            onTimeUpdate={(elapsed) => {}}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-6 bg-white flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          {/* Start/Complete Button */}
          {task.status !== 'Completed' && (
            <button
              onClick={() => onStart(task._id)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
            >
              <FaPlay className="text-sm" />
              {task.status === 'In Progress' ? 'Pause' : 'Start'}
            </button>
          )}

          {task.status === 'In Progress' && (
            <button
              onClick={() => onComplete(task._id)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
            >
              <FaCheckCircle className="text-sm" />
              Complete
            </button>
          )}

          {/* Assign Button */}
          <button
            onClick={() => onAssign(task)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors"
            title="Assign this task via WhatsApp"
          >
            <FaShare className="text-sm" />
            Assign
          </button>

          {/* Citizen Button (Send Notification) */}
          <button
            onClick={() => onCitizen(task)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors"
            title="Send citizen notification with reference number"
          >
            <FaBell className="text-sm" />
            Citizen
          </button>

          {/* Edit Button */}
          {onEdit && (
            <button
              onClick={() => onEdit(task)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-colors"
              title="Edit this task"
            >
              <FaEdit className="text-sm" />
              Edit
            </button>
          )}

          {/* Call Button */}
          {task.referencePhone && (
            <a
              href={`tel:${task.referencePhone}`}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition-colors"
              title="Call the assigned contact"
            >
              <FaPhone className="text-sm" />
              Call
            </a>
          )}
        </div>

        {/* Delete Button - Full Width */}
        <button
          onClick={() => {
            if (window.confirm('Delete this task?')) {
              onDelete(task._id);
            }
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
        >
          <FaTrash className="text-sm" />
          Delete
        </button>
      </div>
    </div>
  );
}

export default TaskCard;
