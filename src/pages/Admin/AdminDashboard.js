import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  FileText, 
  HelpCircle, 
  Send, 
  BarChart3,
  Plus,
  Search,
  RefreshCw,
  Database,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import gsap from 'gsap';
import toast from 'react-hot-toast';

// Import CRUD components
import UserManagement from './components/UserManagement';
import CourseManagement from './components/CourseManagement';
import AssessmentManagement from './components/AssessmentManagement';
import QuestionManagement from './components/QuestionMnagement';
import SubmissionManagement from './components/SubmissionManagement';
import AdminStats from './components/AdminStats';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [lastFetch, setLastFetch] = useState(null);
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    totalCourses: 0,
    totalAssessments: 0,
    totalQuestions: 0,
    totalSubmissions: 0,
    recentActivity: []
  });

  // ✅ Enhanced data fetching with individual collection error handling
  useEffect(() => {
    fetchDashboardData();
    
    // GSAP animations
    gsap.timeline()
      .fromTo('.admin-header', 
        { y: -50, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out' }
      )
      .fromTo('.admin-nav', 
        { x: -100, opacity: 0 }, 
        { x: 0, opacity: 1, duration: 0.6, stagger: 0.1 }, 
        '-=0.4'
      )
      .fromTo('.admin-content', 
        { y: 50, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 0.6 }, 
        '-=0.2'
      );
  }, []);

  // ✅ Helper function to fetch individual collection with error handling
  const fetchCollection = async (collectionName) => {
    try {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return data;
    } catch (error) {
      console.error(`❌ Error fetching ${collectionName}:`, error);
      toast.error(`Failed to fetch ${collectionName}: ${error.message}`);
      return []; // Return empty array on error
    }
  };

  // ✅ Special handling for submissions with orderBy fallback
  const fetchSubmissions = async () => {
    try {
      
      let submissionsData = [];
      
      // Try to fetch with orderBy first
      try {
        const submissionsQuery = query(
          collection(db, 'submissions'), 
          orderBy('submittedAt', 'desc')
        );
        const snapshot = await getDocs(submissionsQuery);
        
        submissionsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Enhanced date handling
            submittedAt: data.submittedAt ? 
              (data.submittedAt.toDate ? data.submittedAt.toDate() : new Date(data.submittedAt)) 
              : new Date(),
            createdAt: data.createdAt ?
              (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt))
              : new Date()
          };
        });
        
      } catch (orderError) {
        console.warn('⚠️ OrderBy failed, fetching without order:', orderError);
        
        // Fallback: fetch without orderBy and sort client-side
        const snapshot = await getDocs(collection(db, 'submissions'));
        
        submissionsData = snapshot.docs.map(doc => {
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
        
        // Sort client-side by submittedAt descending
        submissionsData.sort((a, b) => b.submittedAt - a.submittedAt);
        
      }
      
      return submissionsData;
    } catch (error) {
      console.error('❌ Error fetching submissions:', error);
      toast.error(`Failed to fetch submissions: ${error.message}`);
      return [];
    }
  };

  // ✅ Enhanced dashboard data fetching
  const fetchDashboardData = async () => {
    setLoading(true);
    setConnectionStatus('connecting');
    
    try {
      
      // ✅ Use Promise.allSettled to continue even if some collections fail
      const promises = [
        fetchCollection('users'),
        fetchCollection('courses'),
        fetchCollection('assessments'),
        fetchCollection('questions'),
        fetchSubmissions() // Special handling for submissions
      ];

      const results = await Promise.allSettled(promises);
      
      // ✅ Process results and handle any failures
      const [usersResult, coursesResult, assessmentsResult, questionsResult, submissionsResult] = results;
      
      // Extract data or use empty arrays for failed collections
      const users = usersResult.status === 'fulfilled' ? usersResult.value : [];
      const courses = coursesResult.status === 'fulfilled' ? coursesResult.value : [];
      const assessments = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value : [];
      const questions = questionsResult.status === 'fulfilled' ? questionsResult.value : [];
      const submissions = submissionsResult.status === 'fulfilled' ? submissionsResult.value : [];

      // ✅ Log any failed fetches
      results.forEach((result, index) => {
        const collectionNames = ['users', 'courses', 'assessments', 'questions', 'submissions'];
        if (result.status === 'rejected') {
          console.error(`❌ Failed to fetch ${collectionNames[index]}:`, result.reason);
        }
      });

      // ✅ Get recent activity from submissions
      const recentActivity = submissions.slice(0, 10).map(submission => ({
        id: submission.id,
        type: 'submission',
        userId: submission.userId,
        userEmail: submission.userEmail,
        questionId: submission.questionId,
        assessmentId: submission.assessmentId,
        language: submission.language,
        status: submission.status,
        score: submission.score || 0,
        submittedAt: submission.submittedAt,
        timeSpent: submission.timeSpent
      }));

      // ✅ Update dashboard stats
      const stats = {
        totalUsers: users.length,
        totalCourses: courses.length,
        totalAssessments: assessments.length,
        totalQuestions: questions.length,
        totalSubmissions: submissions.length,
        recentActivity
      };

      setDashboardStats(stats);
      setConnectionStatus('connected');
      setLastFetch(new Date());

  
    } catch (error) {
      console.error('❌ Critical error fetching dashboard data:', error);
      setConnectionStatus('error');
      
      // ✅ More specific error messages
      if (error.code === 'permission-denied') {
        toast.error('Permission denied. Check your Firestore security rules.');
      } else if (error.code === 'unavailable') {
        toast.error('Firestore service unavailable. Please try again later.');
      } else {
        toast.error(`Failed to fetch dashboard data: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Manual refresh function with user feedback
  const handleRefresh = () => {
    toast.promise(
      fetchDashboardData(),
      {
        loading: 'Refreshing dashboard data...',
        success: () => {
          return `Dashboard refreshed! Last updated: ${new Date().toLocaleTimeString()}`;
        },
        error: 'Failed to refresh dashboard data'
      }
    );
  };

  // ✅ Connection status indicator
  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'connecting':
        return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Database className="w-4 h-4 text-gray-500" />;
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected to Firestore';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection Error';
      default:
        return 'Disconnected';
    }
  };

  // ✅ Updated navigation items
  const navItems = [
    { id: 'stats', label: 'Dashboard', icon: BarChart3, color: 'blue' },
    { id: 'users', label: 'Users', icon: Users, color: 'green' },
    { id: 'courses', label: 'Courses', icon: BookOpen, color: 'purple' },
    { id: 'assessments', label: 'Assessments', icon: FileText, color: 'orange' },
    { id: 'questions', label: 'Questions', icon: HelpCircle, color: 'red' },
    { id: 'submissions', label: 'Submissions', icon: Send, color: 'indigo' }
  ];

  // ✅ Render content function
  const renderContent = () => {
    switch (activeTab) {
      case 'stats':
        return <AdminStats searchTerm={searchTerm} dashboardStats={dashboardStats} loading={loading} />;
      case 'users':
        return <UserManagement searchTerm={searchTerm} />;
      case 'courses':
        return <CourseManagement searchTerm={searchTerm} />;
      case 'assessments':
        return <AssessmentManagement searchTerm={searchTerm} />;
      case 'questions':
        return <QuestionManagement searchTerm={searchTerm} />;
      case 'submissions':
        return <SubmissionManagement searchTerm={searchTerm} />;
      default:
        return <AdminStats searchTerm={searchTerm} dashboardStats={dashboardStats} loading={loading} />;
    }
  };

  const activeItem = navItems.find(item => item.id === activeTab);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200 shadow-sm admin-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
            <p className="mt-1 text-gray-600">Manage your coding assessment platform</p>
            
            {/* ✅ Enhanced connection status */}
            <div className="flex items-center mt-2 space-x-4">
              <div className="flex items-center text-sm text-gray-500">
                {getConnectionStatusIcon()}
                <span className="ml-1">{getConnectionStatusText()}</span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <div className={`w-2 h-2 rounded-full mr-1 ${
                  loading ? 'bg-yellow-500' : 
                  connectionStatus === 'connected' ? 'bg-green-500' : 
                  connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
                }`}></div>
                <span>
                  {loading ? 'Syncing...' : 
                   connectionStatus === 'connected' ? 'Up to date' : 
                   connectionStatus === 'error' ? 'Sync failed' : 'Not synced'}
                </span>
              </div>
              {lastFetch && (
                <div className="text-xs text-gray-400">
                  Last updated: {lastFetch.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* ✅ Search Input */}
            <div className="relative">
              <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* ✅ Enhanced Refresh Button */}
            <button 
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center px-4 py-2 text-gray-700 transition-colors bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            {/* ✅ Quick Add Button */}
            <button className="flex items-center px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add {activeItem?.label.slice(0, -1) || 'Item'}
            </button>
          </div>
        </div>

        {/* ✅ Enhanced Quick Stats Bar */}
        <div className="flex items-center justify-between mt-4 space-x-6">
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{dashboardStats.totalUsers}</div>
              <div className="text-xs text-gray-500">Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{dashboardStats.totalCourses}</div>
              <div className="text-xs text-gray-500">Courses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{dashboardStats.totalAssessments}</div>
              <div className="text-xs text-gray-500">Assessments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{dashboardStats.totalQuestions}</div>
              <div className="text-xs text-gray-500">Questions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{dashboardStats.totalSubmissions}</div>
              <div className="text-xs text-gray-500">Submissions</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="sticky top-0 w-64 h-screen bg-white shadow-sm">
          <nav className="p-4">
            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`admin-nav w-full flex items-center px-4 py-3 text-left rounded-lg transition-all duration-200 ${
                      isActive
                        ? `bg-${item.color}-50 text-${item.color}-700 border-l-4 border-${item.color}-500`
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${
                      isActive ? `text-${item.color}-500` : 'text-gray-400'
                    }`} />
                    <span className="font-medium">{item.label}</span>
                    {/* ✅ Enhanced count badges */}
                    <span className={`ml-auto text-xs px-2 py-1 rounded-full ${
                      isActive ? `bg-${item.color}-100 text-${item.color}-600` : 'bg-gray-100 text-gray-500'
                    }`}>
                      {item.id === 'stats' ? '📊' :
                       item.id === 'users' ? dashboardStats.totalUsers :
                       item.id === 'courses' ? dashboardStats.totalCourses :
                       item.id === 'assessments' ? dashboardStats.totalAssessments :
                       item.id === 'questions' ? dashboardStats.totalQuestions :
                       item.id === 'submissions' ? dashboardStats.totalSubmissions : '0'}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* ✅ Enhanced Recent Activity Section */}
          <div className="p-4 border-t">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Recent Activity</h3>
            <div className="space-y-2">
              {dashboardStats.recentActivity.length === 0 ? (
                <p className="text-xs text-gray-500">No recent activity</p>
              ) : (
                dashboardStats.recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={activity.id || index} className="text-xs text-gray-600">
                    <div className="font-medium">New submission</div>
                    <div className="text-gray-400">
                      {activity.submittedAt?.toLocaleDateString()} • 
                      <span className={`ml-1 ${
                        activity.score >= 70 ? 'text-green-600' : 
                        activity.score >= 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        Score: {activity.score || 0}%
                      </span>
                    </div>
                    {activity.language && (
                      <div className="text-xs text-gray-500">
                        {activity.language.toUpperCase()}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="admin-content">
            {/* Content Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {activeItem && (
                    <>
                      <div className={`p-3 bg-${activeItem.color}-100 rounded-lg mr-4`}>
                        <activeItem.icon className={`w-6 h-6 text-${activeItem.color}-600`} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{activeItem.label}</h2>
                        <p className="text-gray-600">Manage {activeItem.label.toLowerCase()} data</p>
                      </div>
                    </>
                  )}
                </div>
                
                {/* ✅ Enhanced context-aware actions */}
                <div className="flex items-center space-x-2">
                  {searchTerm && (
                    <span className="px-3 py-1 text-sm text-blue-600 bg-blue-100 rounded-full">
                      Searching: "{searchTerm}"
                    </span>
                  )}
                  {loading && (
                    <span className="px-3 py-1 text-sm text-yellow-600 bg-yellow-100 rounded-full">
                      Loading...
                    </span>
                  )}
                  {connectionStatus === 'error' && (
                    <span className="px-3 py-1 text-sm text-red-600 bg-red-100 rounded-full">
                      Connection Error
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Dynamic Content */}
            <div className="min-h-96">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
