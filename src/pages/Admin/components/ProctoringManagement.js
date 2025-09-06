import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Shield, AlertTriangle, Eye, Clock, User } from 'lucide-react';

import toast from 'react-hot-toast';
import Modal from '../../../components/UI/Modal';
import DataTable from '../../../components/UI/DataTable';
const ProctoringManagement = ({ searchTerm }) => {
  const [proctoringData, setProctoringData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingSession, setViewingSession] = useState(null);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchProctoringData();
  }, []);

  const fetchProctoringData = async () => {
    try {
      const proctoringSnapshot = await getDocs(collection(db, 'proctoring'));
      const proctoringDataArray = proctoringSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime?.toDate() || new Date(),
        endTime: doc.data().endTime?.toDate() || null
      }));
      
      setProctoringData(proctoringDataArray);
    } catch (error) {
      console.error('Error fetching proctoring data:', error);
      toast.error('Failed to fetch proctoring data');
    } finally {
      setLoading(false);
    }
  };

  const getViolationTypeColor = (type) => {
    switch (type) {
      case 'tab_switch': return 'bg-yellow-100 text-yellow-800';
      case 'copy_paste': return 'bg-red-100 text-red-800';
      case 'suspicious_activity': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getViolationCount = (session, type = null) => {
    if (!session.violations) return 0;
    if (type) {
      return session.violations.filter(v => v.type === type).length;
    }
    return session.violations.length;
  };

  const filteredData = proctoringData.filter(session => {
    const matchesSearch = session.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'violations' && getViolationCount(session) > 0) ||
                         (filterType === 'clean' && getViolationCount(session) === 0);
    
    return matchesSearch && matchesFilter;
  });

  const columns = [
    {
      key: 'userId',
      header: 'User',
      render: (session) => (
        <div className="flex items-center space-x-2">
          <User className="w-4 h-4 text-gray-500" />
          <span className="font-mono text-sm">{session.userId?.substring(0, 8)}...</span>
        </div>
      )
    },
    {
      key: 'startTime',
      header: 'Session Start',
      render: (session) => (
        <span className="text-sm text-gray-600">
          {session.startTime?.toLocaleString()}
        </span>
      )
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (session) => {
        const duration = session.endTime 
          ? Math.floor((session.endTime - session.startTime) / (1000 * 60))
          : Math.floor((new Date() - session.startTime) / (1000 * 60));
        return (
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm">{duration}m</span>
          </div>
        );
      }
    },
    {
      key: 'violations',
      header: 'Violations',
      render: (session) => {
        const totalViolations = getViolationCount(session);
        return (
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
              totalViolations === 0 
                ? 'bg-green-100 text-green-800' 
                : totalViolations <= 3 
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
            }`}>
              <AlertTriangle className="w-3 h-3 mr-1" />
              {totalViolations}
            </span>
          </div>
        );
      }
    },
    {
      key: 'violationTypes',
      header: 'Violation Types',
      render: (session) => {
        if (!session.violations || session.violations.length === 0) {
          return <span className="text-sm text-green-600">Clean Session</span>;
        }
        
        const types = [...new Set(session.violations.map(v => v.type))];
        return (
          <div className="flex flex-wrap gap-1">
            {types.map(type => (
              <span 
                key={type}
                className={`inline-flex px-2 py-1 text-xs rounded-full ${getViolationTypeColor(type)}`}
              >
                {type.replace('_', ' ')}
              </span>
            ))}
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (session) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          session.isCompleted 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-green-100 text-green-800'
        }`}>
          {session.isCompleted ? 'Completed' : 'Active'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (session) => (
        <button
          onClick={() => setViewingSession(session)}
          className="p-1 text-blue-600 hover:text-blue-800"
          title="View Details"
        >
          <Eye className="w-4 h-4" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Proctoring Sessions ({filteredData.length})
          </h3>
          <p className="text-gray-600">Monitor assessment sessions and violations</p>
        </div>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Sessions</option>
          <option value="violations">With Violations</option>
          <option value="clean">Clean Sessions</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center">
            <Shield className="w-8 h-8 mr-3 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{proctoringData.length}</p>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 mr-3 text-red-500" />
            <div>
              <p className="text-sm text-gray-600">With Violations</p>
              <p className="text-2xl font-bold text-gray-900">
                {proctoringData.filter(s => getViolationCount(s) > 0).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center">
            <User className="w-8 h-8 mr-3 text-green-500" />
            <div>
              <p className="text-sm text-gray-600">Clean Sessions</p>
              <p className="text-2xl font-bold text-gray-900">
                {proctoringData.filter(s => getViolationCount(s) === 0).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center">
            <Clock className="w-8 h-8 mr-3 text-orange-500" />
            <div>
              <p className="text-sm text-gray-600">Active Sessions</p>
              <p className="text-2xl font-bold text-gray-900">
                {proctoringData.filter(s => !s.isCompleted).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Proctoring Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        loading={loading}
        searchable={true}
        sortable={true}
        emptyMessage="No proctoring data found"
      />

      {/* View Session Modal */}
      <Modal
        isOpen={!!viewingSession}
        onClose={() => setViewingSession(null)}
        title="Proctoring Session Details"
        size="lg"
      >
        {viewingSession && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">User ID</label>
                <p className="p-2 font-mono text-sm bg-gray-100 rounded">
                  {viewingSession.userId}
                </p>
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Session Status</label>
                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                  viewingSession.isCompleted 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {viewingSession.isCompleted ? 'Completed' : 'Active'}
                </span>
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Start Time</label>
                <p className="text-sm text-gray-600">
                  {viewingSession.startTime?.toLocaleString()}
                </p>
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Total Violations</label>
                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                  getViolationCount(viewingSession) === 0 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {getViolationCount(viewingSession)}
                </span>
              </div>
            </div>

            {viewingSession.violations && viewingSession.violations.length > 0 && (
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Violation History ({viewingSession.violations.length})
                </label>
                <div className="space-y-2 overflow-y-auto max-h-64">
                  {viewingSession.violations.map((violation, index) => (
                    <div
                      key={index}
                      className="p-3 border border-gray-200 rounded-lg bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getViolationTypeColor(violation.type)}`}>
                          {violation.type.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {violation.timestamp?.toDate?.()?.toLocaleString() || 'N/A'}
                        </span>
                      </div>
                      {violation.details && (
                        <p className="text-sm text-gray-600">{violation.details}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProctoringManagement;
