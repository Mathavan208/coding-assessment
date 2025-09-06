import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Eye, Code, Clock, CheckCircle, X, AlertTriangle, RefreshCw } from 'lucide-react';
import LoadingSpinner from '../../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';
import Modal from '../../../components/UI/Modal';
import DataTable from '../../../components/UI/DataTable';

const SubmissionManagement = ({ searchTerm }) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  // ✅ Enhanced fetchSubmissions with better error handling and debugging
  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      
      // ✅ Try multiple approaches to fetch submissions
      let submissionsData = [];
      
      // Approach 1: Try with orderBy
      try {
        const submissionsQuery = query(
          collection(db, 'submissions'),
          orderBy('submittedAt', 'desc')
        );
        
        const submissionsSnapshot = await getDocs(submissionsQuery);
        
        submissionsData = submissionsSnapshot.docs.map(doc => {
          const data = doc.data();
          
          return {
            id: doc.id,
            ...data,
            // ✅ Better date handling
            submittedAt: data.submittedAt ? 
              (data.submittedAt.toDate ? data.submittedAt.toDate() : new Date(data.submittedAt)) 
              : new Date(),
            createdAt: data.createdAt ? 
              (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) 
              : new Date()
          };
        });
      } catch (orderByError) {
        console.warn('⚠️ OrderBy failed, trying without orderBy:', orderByError);
        
        // Approach 2: Fetch without orderBy (fallback)
        const submissionsSnapshot = await getDocs(collection(db, 'submissions'));
        
        submissionsData = submissionsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            submittedAt: data.submittedAt ? 
              (data.submittedAt.toDate ? data.submittedAt.toDate() : new Date(data.submittedAt)) 
              : new Date(),
            createdAt: data.createdAt ? 
              (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) 
              : new Date()
          };
        });
        
        // Sort client-side if orderBy failed
        submissionsData.sort((a, b) => b.submittedAt - a.submittedAt);
      }
      
      setSubmissions(submissionsData);
      
      if (submissionsData.length === 0) {
        console.log('⚠️ No submissions found in Firestore');
        toast.info('No submissions found');
      } else {

    }
      
    } catch (error) {
      console.error('❌ Error fetching submissions:', error);
      setError(error.message);
      
      // ✅ More specific error messages
      if (error.code === 'permission-denied') {
        toast.error('Permission denied. Check Firestore rules.');
      } else if (error.code === 'unavailable') {
        toast.error('Firestore service unavailable. Please try again.');
      } else {
        toast.error(`Failed to fetch submissions: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Manual refresh function
  const handleRefresh = () => {
    toast.promise(
      fetchSubmissions(),
      {
        loading: 'Refreshing submissions...',
        success: 'Submissions refreshed!',
        error: 'Failed to refresh submissions'
      }
    );
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'wrong_answer': return 'bg-red-100 text-red-800';
      case 'runtime_error': return 'bg-orange-100 text-orange-800';
      case 'time_limit_exceeded': return 'bg-yellow-100 text-yellow-800';
      case 'compilation_error': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'accepted': return <CheckCircle className="w-4 h-4" />;
      case 'wrong_answer': return <X className="w-4 h-4" />;
      case 'runtime_error': 
      case 'compilation_error': return <AlertTriangle className="w-4 h-4" />;
      case 'time_limit_exceeded': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch = 
      submission.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.questionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.assessmentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.language?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || submission.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      key: 'userId',
      header: 'User ID',
      render: (submission) => (
        <div>
          <span className="font-mono text-sm">{submission.userId?.substring(0, 8)}...</span>
          {submission.userEmail && (
            <p className="text-xs text-gray-500 truncate max-w-32">
              {submission.userEmail}
            </p>
          )}
        </div>
      )
    },
    {
      key: 'assessmentId',
      header: 'Assessment',
      render: (submission) => (
        <span className="font-mono text-sm">{submission.assessmentId?.substring(0, 10)}...</span>
      )
    },
    {
      key: 'questionId',
      header: 'Question',
      render: (submission) => (
        <span className="font-mono text-sm">{submission.questionId?.substring(0, 10)}...</span>
      )
    },
    {
      key: 'language',
      header: 'Language',
      render: (submission) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          submission.language === 'java' ? 'bg-red-100 text-red-800' :
          submission.language === 'python' ? 'bg-blue-100 text-blue-800' :
          submission.language === 'javascript' ? 'bg-yellow-100 text-yellow-800' :
          submission.language === 'sql' ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {submission.language?.toUpperCase() || 'Unknown'}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (submission) => (
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(submission.status)}`}>
            {getStatusIcon(submission.status)}
            <span className="ml-1 capitalize">
              {submission.status?.replace('_', ' ') || 'Unknown'}
            </span>
          </span>
        </div>
      )
    },
    {
      key: 'score',
      header: 'Score',
      render: (submission) => (
        <div className="text-right">
          <span className="font-semibold">
            {submission.score !== undefined ? submission.score : 'N/A'}
          </span>
          <span className="text-gray-500">
            /{submission.maxScore || submission.totalScore || 100}
          </span>
          {submission.passedTests !== undefined && submission.totalTests !== undefined && (
            <p className="text-xs text-gray-500">
              {submission.passedTests}/{submission.totalTests} tests
            </p>
          )}
        </div>
      )
    },
    {
      key: 'executionTime',
      header: 'Time',
      render: (submission) => (
        <span className="text-sm text-gray-600">
          {submission.executionTime ? `${submission.executionTime}ms` : 
           submission.timeSpent ? `${submission.timeSpent}s` : 'N/A'}
        </span>
      )
    },
    {
      key: 'submittedAt',
      header: 'Submitted At',
      render: (submission) => (
        <div className="text-sm text-gray-600">
          <div>{submission.submittedAt?.toLocaleDateString()}</div>
          <div className="text-xs text-gray-500">
            {submission.submittedAt?.toLocaleTimeString()}
          </div>
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (submission) => (
        <button
          onClick={() => setViewingSubmission(submission)}
          className="p-1 text-blue-600 hover:text-blue-800"
          title="View Details"
        >
          <Eye className="w-4 h-4" />
        </button>
      )
    }
  ];

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900">Failed to Load Submissions</h3>
          <p className="mb-4 text-gray-600">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Submissions ({filteredSubmissions.length})
          </h3>
          <p className="text-gray-600">Monitor and review code submissions</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="accepted">Accepted</option>
            <option value="wrong_answer">Wrong Answer</option>
            <option value="runtime_error">Runtime Error</option>
            <option value="time_limit_exceeded">Time Limit Exceeded</option>
            <option value="compilation_error">Compilation Error</option>
          </select>
          
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center">
            <Code className="w-8 h-8 mr-3 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600">Total Submissions</p>
              <p className="text-2xl font-bold text-gray-900">{submissions.length}</p>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 mr-3 text-green-500" />
            <div>
              <p className="text-sm text-gray-600">Accepted</p>
              <p className="text-2xl font-bold text-gray-900">
                {submissions.filter(s => s.status === 'accepted').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center">
            <X className="w-8 h-8 mr-3 text-red-500" />
            <div>
              <p className="text-sm text-gray-600">Wrong Answer</p>
              <p className="text-2xl font-bold text-gray-900">
                {submissions.filter(s => s.status === 'wrong_answer').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 mr-3 text-orange-500" />
            <div>
              <p className="text-sm text-gray-600">Errors</p>
              <p className="text-2xl font-bold text-gray-900">
                {submissions.filter(s => 
                  s.status === 'runtime_error' || 
                  s.status === 'compilation_error'
                ).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-3 text-sm text-gray-600 bg-gray-100 rounded-lg">
          <strong>Debug:</strong> Found {submissions.length} submissions. 
          Filtered: {filteredSubmissions.length}. 
          Search: "{searchTerm}". Filter: "{filterStatus}".
        </div>
      )}

      {/* Submissions Table */}
      <DataTable
        columns={columns}
        data={filteredSubmissions}
        loading={loading}
        searchable={true}
        sortable={true}
        emptyMessage={
          submissions.length === 0 
            ? "No submissions found. Check your Firestore collection."
            : "No submissions match your search criteria."
        }
      />

      {/* View Submission Modal */}
      <Modal
        isOpen={!!viewingSubmission}
        onClose={() => setViewingSubmission(null)}
        title="Submission Details"
        size="xl"
      >
        {viewingSubmission && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Status</label>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(viewingSubmission.status)}`}>
                    {getStatusIcon(viewingSubmission.status)}
                    <span className="ml-2 capitalize">
                      {viewingSubmission.status?.replace('_', ' ') || 'Unknown'}
                    </span>
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Score</label>
                <p className="text-lg font-semibold">
                  {viewingSubmission.score || 0}/{viewingSubmission.maxScore || viewingSubmission.totalScore || 100}
                </p>
                {viewingSubmission.passedTests !== undefined && (
                  <p className="text-sm text-gray-500">
                    {viewingSubmission.passedTests}/{viewingSubmission.totalTests} tests passed
                  </p>
                )}
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Language</label>
                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                  viewingSubmission.language === 'java' ? 'bg-red-100 text-red-800' :
                  viewingSubmission.language === 'python' ? 'bg-blue-100 text-blue-800' :
                  viewingSubmission.language === 'javascript' ? 'bg-yellow-100 text-yellow-800' :
                  viewingSubmission.language === 'sql' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {viewingSubmission.language?.toUpperCase() || 'Unknown'}
                </span>
              </div>
            </div>

            {/* Additional Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Execution Time</label>
                <p className="text-sm text-gray-600">
                  {viewingSubmission.executionTime ? `${viewingSubmission.executionTime}ms` : 
                   viewingSubmission.timeSpent ? `${viewingSubmission.timeSpent}s` : 'N/A'}
                </p>
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Submitted</label>
                <p className="text-sm text-gray-600">
                  {viewingSubmission.submittedAt?.toLocaleString() || 'Unknown'}
                </p>
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">Submitted Code</label>
              <pre className="p-4 overflow-x-auto text-sm text-green-400 bg-gray-900 rounded-lg max-h-64">
                {viewingSubmission.code || 'No code available'}
              </pre>
            </div>

            {/* Test Results */}
            {(viewingSubmission.testResults || viewingSubmission.testCasesResults || viewingSubmission.results) && (
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Test Results</label>
                <div className="space-y-2 overflow-y-auto max-h-64">
                  {(viewingSubmission.testResults || viewingSubmission.testCasesResults || viewingSubmission.results || []).map((result, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg ${
                        result.passed || result.status === 'passed'
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">Test Case {index + 1}</span>
                        <span className={`text-sm px-2 py-1 rounded ${
                          result.passed || result.status === 'passed' 
                            ? 'bg-green-600 text-white' 
                            : 'bg-red-600 text-white'
                        }`}>
                          {result.passed || result.status === 'passed' ? 'PASSED' : 'FAILED'}
                        </span>
                      </div>
                      {!(result.passed || result.status === 'passed') && (
                        <div className="text-sm text-gray-600">
                          <div>Expected: <code className="px-1 bg-gray-200 rounded">{result.expectedOutput || result.expected}</code></div>
                          <div>Got: <code className="px-1 bg-gray-200 rounded">{result.actualOutput || result.actual || result.output}</code></div>
                          {result.error && (
                            <div>Error: <code className="px-1 bg-red-200 rounded">{result.error}</code></div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw Data (for debugging) */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="text-sm font-medium text-gray-700 cursor-pointer">Raw Submission Data (Debug)</summary>
                <pre className="p-3 mt-2 overflow-auto text-xs bg-gray-100 rounded max-h-40">
                  {JSON.stringify(viewingSubmission, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SubmissionManagement;
