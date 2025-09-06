import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { 
  Users, 
  FileText, 
  Code, 
  TrendingUp, 
  Clock,
  Target,
  BookOpen,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import LoadingSpinner from '../../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';

const AdminStats = ({ searchTerm, dashboardStats, loading: propLoading }) => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalAdmins: 0,
    totalCourses: 0,
    activeCourses: 0,
    totalQuestions: 0,
    totalAssessments: 0,
    activeAssessments: 0,
    totalSubmissions: 0,
    acceptedSubmissions: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  // ✅ Enhanced data fetching with better error handling
  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      
      // ✅ Fetch all collections in parallel with individual error handling
      const collectionPromises = [
        fetchCollection('users', 'users'),
        fetchCollection('courses', 'courses'),
        fetchCollection('questions', 'questions'),
        fetchCollection('assessments', 'assessments'),
        fetchSubmissions()
      ];

      const [
        usersData,
        coursesData,
        questionsData,
        assessmentsData,
        submissionsData
      ] = await Promise.allSettled(collectionPromises);

      // ✅ Process results with error handling
      const users = usersData.status === 'fulfilled' ? usersData.value : [];
      const courses = coursesData.status === 'fulfilled' ? coursesData.value : [];
      const questions = questionsData.status === 'fulfilled' ? questionsData.value : [];
      const assessments = assessmentsData.status === 'fulfilled' ? assessmentsData.value : [];
      const submissions = submissionsData.status === 'fulfilled' ? submissionsData.value : [];

      // ✅ Log any failed fetches
      [usersData, coursesData, questionsData, assessmentsData, submissionsData].forEach((result, index) => {
        const collections = ['users', 'courses', 'questions', 'assessments', 'submissions'];
        if (result.status === 'rejected') {
          console.error(`❌ Failed to fetch ${collections[index]}:`, result.reason);
        }
      });

      // ✅ Calculate comprehensive stats with validation
      const calculatedStats = calculateStats({
        users,
        courses,
        questions,
        assessments,
        submissions
      });

      setStats(calculatedStats);
      setLastFetch(new Date());
      

    } catch (error) {
      console.error('❌ Error fetching admin stats:', error);
      setError(error.message);
      toast.error('Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Helper function to fetch a collection with error handling
  const fetchCollection = async (collectionName, logName) => {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return data;
    } catch (error) {
      console.error(`❌ Error fetching ${logName}:`, error);
      throw error;
    }
  };

  // ✅ Special handling for submissions with date processing
  const fetchSubmissions = async () => {
    try {
      // Try to fetch with orderBy first
      let snapshot;
      try {
        const submissionsQuery = query(
          collection(db, 'submissions'), 
          orderBy('submittedAt', 'desc')
        );
        snapshot = await getDocs(submissionsQuery);
      } catch (orderError) {
        console.warn('⚠️ OrderBy failed, fetching without order:', orderError);
        snapshot = await getDocs(collection(db, 'submissions'));
      }

      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          // ✅ Enhanced date handling
          submittedAt: docData.submittedAt ? 
            (docData.submittedAt.toDate ? docData.submittedAt.toDate() : new Date(docData.submittedAt)) 
            : new Date(),
          createdAt: docData.createdAt ?
            (docData.createdAt.toDate ? docData.createdAt.toDate() : new Date(docData.createdAt))
            : new Date()
        };
      });

      // Sort client-side if server-side ordering failed
      const sortedData = data.sort((a, b) => b.submittedAt - a.submittedAt);
      
      return sortedData;
    } catch (error) {
      console.error('❌ Error fetching submissions:', error);
      throw error;
    }
  };

  // ✅ Calculate stats with comprehensive validation
  const calculateStats = ({ users, courses, questions, assessments, submissions }) => {
    // ✅ User statistics with role validation
    const totalUsers = users.length;
    const totalStudents = users.filter(u => 
      u.role === 'student' || u.role === 'learner' || (!u.role && u.email) // fallback for users without explicit role
    ).length;
    const totalAdmins = users.filter(u => 
      u.role === 'admin' || u.role === 'administrator'
    ).length;

    // ✅ Course statistics with status validation
    const totalCourses = courses.length;
    const activeCourses = courses.filter(c => 
      c.isActive === true || c.status === 'active' || (c.isActive !== false && !c.status)
    ).length;

    // ✅ Question statistics
    const totalQuestions = questions.length;

    // ✅ Assessment statistics with status validation
    const totalAssessments = assessments.length;
    const activeAssessments = assessments.filter(a => 
      a.isActive === true || a.status === 'active' || (a.isActive !== false && !a.status)
    ).length;

    // ✅ Submission statistics with status validation
    const totalSubmissions = submissions.length;
    const acceptedSubmissions = submissions.filter(s => 
      s.status === 'accepted' || s.status === 'passed' || (s.score && s.score >= 70)
    ).length;

    // ✅ Recent activity with better data structure
    const recentActivity = submissions.slice(0, 15).map(submission => ({
      id: submission.id,
      type: 'submission',
      userId: submission.userId,
      userEmail: submission.userEmail,
      questionId: submission.questionId,
      assessmentId: submission.assessmentId,
      language: submission.language,
      status: submission.status,
      score: submission.score || 0,
      passedTests: submission.passedTests,
      totalTests: submission.totalTests,
      submittedAt: submission.submittedAt,
      timeSpent: submission.timeSpent
    }));

    return {
      totalUsers,
      totalStudents,
      totalAdmins,
      totalCourses,
      activeCourses,
      totalQuestions,
      totalAssessments,
      activeAssessments,
      totalSubmissions,
      acceptedSubmissions,
      recentActivity
    };
  };

  // ✅ Manual refresh function
  const handleRefresh = () => {
    toast.promise(
      fetchStats(),
      {
        loading: 'Refreshing statistics...',
        success: 'Statistics updated!',
        error: 'Failed to refresh statistics'
      }
    );
  };

  // ✅ Error state
  if (error && !loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900">Failed to Load Statistics</h3>
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

  // ✅ Loading state
  if (loading || propLoading) {
    return <LoadingSpinner size="lg" text="Loading statistics..." />;
  }

  // ✅ Calculate derived metrics
  const successRate = stats.totalSubmissions > 0 
    ? Math.round((stats.acceptedSubmissions / stats.totalSubmissions) * 100) 
    : 0;

  const avgQuestionsPerAssessment = stats.totalAssessments > 0
    ? Math.round(stats.totalQuestions / stats.totalAssessments)
    : 0;

  return (
    <div className="space-y-6">
      {/* ✅ Refresh indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Statistics</h2>
          <p className="text-gray-600">
            Overview of your coding assessment platform
            {lastFetch && (
              <span className="ml-2 text-sm text-gray-500">
                • Last updated: {lastFetch.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center px-4 py-2 text-gray-700 transition-colors bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ✅ Enhanced Overview Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-6 bg-white border shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
              <div className="flex items-center mt-2 text-sm">
                <span className="text-green-600">{stats.totalStudents} Students</span>
                <span className="mx-2 text-gray-400">•</span>
                <span className="text-blue-600">{stats.totalAdmins} Admins</span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Courses</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalCourses}</p>
              <div className="flex items-center mt-2 text-sm">
                <span className="text-green-600">{stats.activeCourses} Active</span>
                {stats.totalCourses > 0 && (
                  <>
                    <span className="mx-2 text-gray-400">•</span>
                    <span className="text-gray-500">
                      {Math.round((stats.activeCourses / stats.totalCourses) * 100)}%
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Questions</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalQuestions}</p>
              <div className="flex items-center mt-2 text-sm">
                <span className="text-purple-600">{stats.totalAssessments} Assessments</span>
                {avgQuestionsPerAssessment > 0 && (
                  <>
                    <span className="mx-2 text-gray-400">•</span>
                    <span className="text-gray-500">{avgQuestionsPerAssessment} avg/test</span>
                  </>
                )}
              </div>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Submissions</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalSubmissions}</p>
              <div className="flex items-center mt-2 text-sm">
                <span className={`${successRate >= 70 ? 'text-green-600' : successRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {successRate}% Success Rate
                </span>
                <span className="mx-2 text-gray-400">•</span>
                <span className="text-gray-500">{stats.acceptedSubmissions} passed</span>
              </div>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Code className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Enhanced Detailed Stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Performance Metrics */}
        <div className="p-6 bg-white border shadow-sm rounded-xl">
          <h3 className="flex items-center mb-4 text-lg font-semibold text-gray-900">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
            Performance Metrics
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <div className="flex items-center">
                <Target className="w-5 h-5 mr-3 text-green-500" />
                <span className="font-medium">Success Rate</span>
              </div>
              <div className="text-right">
                <span className={`text-lg font-bold ${successRate >= 70 ? 'text-green-600' : successRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {successRate}%
                </span>
                <p className="text-xs text-gray-500">
                  {stats.acceptedSubmissions}/{stats.totalSubmissions}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <div className="flex items-center">
                <Users className="w-5 h-5 mr-3 text-blue-500" />
                <span className="font-medium">Active Students</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-blue-600">{stats.totalStudents}</span>
                <p className="text-xs text-gray-500">
                  {Math.round((stats.totalStudents / Math.max(stats.totalUsers, 1)) * 100)}% of users
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <div className="flex items-center">
                <FileText className="w-5 h-5 mr-3 text-purple-500" />
                <span className="font-medium">Active Assessments</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-purple-600">{stats.activeAssessments}</span>
                <p className="text-xs text-gray-500">
                  {stats.totalAssessments > 0 ? Math.round((stats.activeAssessments / stats.totalAssessments) * 100) : 0}% active
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <div className="flex items-center">
                <BookOpen className="w-5 h-5 mr-3 text-green-500" />
                <span className="font-medium">Questions/Assessment</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-green-600">{avgQuestionsPerAssessment}</span>
                <p className="text-xs text-gray-500">Average count</p>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ Enhanced Recent Activity */}
        <div className="p-6 bg-white border shadow-sm rounded-xl">
          <h3 className="flex items-center mb-4 text-lg font-semibold text-gray-900">
            <Clock className="w-5 h-5 mr-2 text-orange-500" />
            Recent Activity
          </h3>
          
          <div className="space-y-3 overflow-y-auto max-h-80">
            {stats.recentActivity.length === 0 ? (
              <p className="py-8 text-center text-gray-500">No recent activity</p>
            ) : (
              stats.recentActivity.map((activity, index) => (
                <div key={activity.id || index} className="flex items-center p-3 space-x-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.status === 'accepted' || activity.score >= 70 ? 'bg-green-500' :
                    activity.status === 'wrong_answer' || activity.score < 50 ? 'bg-red-500' :
                    'bg-yellow-500'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      Code Submission • {activity.language?.toUpperCase() || 'Unknown'}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>Score: {activity.score || 0}%</span>
                      {activity.passedTests !== undefined && activity.totalTests !== undefined && (
                        <>
                          <span>•</span>
                          <span>{activity.passedTests}/{activity.totalTests} tests</span>
                        </>
                      )}
                      {activity.timeSpent && (
                        <>
                          <span>•</span>
                          <span>{activity.timeSpent}s</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400">
                      {activity.submittedAt?.toLocaleDateString()}
                    </span>
                    <p className="text-xs text-gray-400">
                      {activity.submittedAt?.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {stats.recentActivity.length > 0 && (
            <div className="pt-3 mt-4 border-t border-gray-200">
              <p className="text-xs text-center text-gray-500">
                Showing {Math.min(15, stats.recentActivity.length)} most recent submissions
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ✅ Enhanced Quick Actions */}
      <div className="p-6 text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
        <h3 className="mb-4 text-xl font-bold">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <button className="p-4 text-left transition-all bg-white rounded-lg bg-opacity-20 hover:bg-opacity-30 focus:bg-opacity-30 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50">
            <Users className="w-6 h-6 mb-2" />
            <p className="font-medium">Manage Users</p>
            <p className="text-sm opacity-90">Add or edit user accounts</p>
          </button>
          
          <button className="p-4 text-left transition-all bg-white rounded-lg bg-opacity-20 hover:bg-opacity-30 focus:bg-opacity-30 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50">
            <FileText className="w-6 h-6 mb-2" />
            <p className="font-medium">Create Assessment</p>
            <p className="text-sm opacity-90">Build new coding challenges</p>
          </button>
          
          <button className="p-4 text-left transition-all bg-white rounded-lg bg-opacity-20 hover:bg-opacity-30 focus:bg-opacity-30 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50">
            <TrendingUp className="w-6 h-6 mb-2" />
            <p className="font-medium">View Analytics</p>
            <p className="text-sm opacity-90">Analyze student performance</p>
          </button>
        </div>
      </div>

      {/* ✅ Debug Info (development only) */}
     
    </div>
  );
};

export default AdminStats;
