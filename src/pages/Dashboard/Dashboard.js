import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import {
  Clock,
  FileText,
  Trophy,
  CheckCircle,
  Play,
  Calendar,
  Star,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';
import gsap from 'gsap';

const Dashboard = () => {
  const { user, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [assessments, setAssessments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [userStats, setUserStats] = useState({
    totalAssessments: 0,
    completedAssessments: 0,
    averageScore: 0,
    totalTimeSpent: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && userProfile) {
      fetchDashboardData();
    }
  }, [user, userProfile]);

  useEffect(() => {
    gsap.fromTo('.dashboard-header',
      { opacity: 0, y: -30 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }
    );
    gsap.fromTo('.stats-card',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, delay: 0.3 }
    );
    gsap.fromTo('.assessment-card',
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, delay: 0.6 }
    );
  }, [assessments]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all assessments
      const assessmentsSnapshot = await getDocs(collection(db, 'assessments'));
      const assessmentsData = assessmentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // Fetch user document (source of truth for completion)
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      // Map shape: { [assessmentId]: { score, avgExecMs, completedAt } }
      const completedMap = userData.assessmentsCompleted || {};

      // Fetch submissions for this user (only relevant for incomplete assessments now)
      let submissionsData = [];
      try {
        const submissionsQuery = query(
          collection(db, 'submissions'),
          where('userId', '==', user.uid)
        );
        const submissionsSnap = await getDocs(submissionsQuery);
        submissionsData = submissionsSnap.docs.map(d => {
          const data = d.data();
          let submittedAtDate = null;
          if (data.submittedAt) {
            if (typeof data.submittedAt.toDate === 'function') submittedAtDate = data.submittedAt.toDate();
            else if (typeof data.submittedAt === 'string') submittedAtDate = new Date(data.submittedAt);
            else if (data.submittedAt instanceof Date) submittedAtDate = data.submittedAt;
          }
          return { id: d.id, ...data, submittedAt: submittedAtDate };
        }).sort((a, b) => {
          if (!a.submittedAt && !b.submittedAt) return 0;
          if (!a.submittedAt) return 1;
          if (!b.submittedAt) return -1;
          return new Date(b.submittedAt) - new Date(a.submittedAt);
        });
      } catch {
        toast.error('Failed to load submission history');
      }

      // Build assessment cards using completedMap
      const cards = assessmentsData.map(a => {
        const entry = completedMap[a.id]; // { score, avgExecMs, completedAt } | undefined
        const isCompleted = !!entry && typeof entry.score === 'number';

        // Only show attempts info for incomplete ones
        const aSubs = isCompleted ? [] : submissionsData.filter(s => s.assessmentId === a.id);
        const chances = a.chances || 1;
        const submissionCount = aSubs.length;
        const chancesRemaining = Math.max(0, chances - submissionCount);
        const canRetake = !isCompleted && submissionCount > 0;
        const latestSubmission = aSubs.length > 0 ? aSubs : null;

        return {
          ...a,
          isCompleted,
          userScore: isCompleted ? entry.score : (aSubs.length ? Math.max(...aSubs.map(s => s.score || 0)) : 0),
          avgExecMs: isCompleted ? (entry.avgExecMs || 0) : undefined,
          completedAt: isCompleted ? (entry.completedAt ? (typeof entry.completedAt.toDate === 'function' ? entry.completedAt.toDate() : new Date(entry.completedAt)) : null) : null,
          chancesUsed: submissionCount,
          chancesRemaining,
          submissionDate: latestSubmission?.submittedAt || null,
          submissionId: latestSubmission?.id || null,
          canRetake,
          allSubmissions: aSubs
        };
      });

      // Sort: incomplete first, then by creation date
      const sorted = cards.sort((x, y) => {
        if (x.isCompleted && !y.isCompleted) return 1;
        if (!x.isCompleted && y.isCompleted) return -1;
        return new Date(y.createdAt || 0) - new Date(x.createdAt || 0);
      });

      setAssessments(sorted);

      // Recent submissions: only for incomplete assessments
      const incompleteIds = new Set(sorted.filter(a => !a.isCompleted).map(a => a.id));
      setSubmissions(submissionsData.filter(s => incompleteIds.has(s.assessmentId)));

      // Stats
      const completedEntries = Object.entries(completedMap); // [[assessmentId, {score, avgExecMs, completedAt}], ...]
      const completedCount = completedEntries.length;
      const avgScore = completedCount > 0
        ? Math.round(completedEntries.reduce((sum, [, v]) => sum + (Number(v?.score) || 0), 0) / completedCount)
        : 0;
      const totalTimeSpent = submissionsData.reduce((sum, s) => sum + (s.timeSpent || 0), 0);

      setUserStats({
        totalAssessments: assessmentsData.length,
        completedAssessments: completedCount,
        averageScore: avgScore,
        totalTimeSpent: Math.round(totalTimeSpent / 60)
      });
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAssessment = (assessmentId) => {
    navigate(`/assessment/${assessmentId}`);
  };

  const handleViewResults = (assessmentId) => {
    navigate(`/results/${assessmentId}`);
  };

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return `${hours}h ${remaining}m`;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeColor = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <LoadingSpinner size="xl" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm dashboard-header">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome back, {userProfile?.name}!</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Logged in as</p>
                <p className="font-medium text-gray-900">{userProfile?.email}</p>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-white transition-colors bg-red-600 rounded-lg hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="p-6 bg-white shadow-sm rounded-xl stats-card">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Assessments</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.totalAssessments}</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white shadow-sm rounded-xl stats-card">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.completedAssessments}</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white shadow-sm rounded-xl stats-card">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Trophy className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Average Score</p>
                <p className={`text-2xl font-bold ${getScoreColor(userStats.averageScore)}`}>
                  {userStats.averageScore}%
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white shadow-sm rounded-xl stats-card">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Time Spent</p>
                <p className="text-2xl font-bold text-gray-900">{formatTime(userStats.totalTimeSpent)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Assessments Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Assessments</h2>
            <div className="text-sm text-gray-500">
              {assessments.filter(a => !a.isCompleted).length} pending • {assessments.filter(a => a.isCompleted).length} completed
            </div>
          </div>

          {assessments.length === 0 ? (
            <div className="py-12 text-center bg-white shadow-sm rounded-xl">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-900">No assessments available</h3>
              <p className="text-gray-500">Check back later for new assessments.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {assessments.map((assessment) => (
                <div
                  key={assessment.id}
                  className={`bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 assessment-card ${
                    assessment.isCompleted
                      ? 'border-green-500 bg-gradient-to-r from-green-50 to-white'
                      : assessment.canRetake
                      ? 'border-orange-500 bg-gradient-to-r from-orange-50 to-white'
                      : 'border-blue-500 hover:border-blue-600'
                  }`}
                  onClick={() => !assessment.isCompleted && handleStartAssessment(assessment.id)}
                >
                  <div className="p-6">
                    {/* Header with status */}
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="flex-1 pr-2 text-xl font-semibold text-gray-900">
                        {assessment.title}
                      </h3>
                      {assessment.isCompleted ? (
                        <div className="flex items-center flex-shrink-0 text-green-600">
                          <CheckCircle className="w-5 h-5 mr-1" />
                          <span className="text-sm font-medium">Completed</span>
                        </div>
                      ) : assessment.canRetake ? (
                        <div className="flex items-center flex-shrink-0 text-orange-600">
                          <RefreshCw className="w-5 h-5 mr-1" />
                          <span className="text-sm font-medium">Retake</span>
                        </div>
                      ) : null}
                    </div>

                    {/* Description */}
                    <p className="mb-4 leading-relaxed text-gray-600 line-clamp-2">
                      {assessment.description}
                    </p>

                    {/* Metadata */}
                    <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {assessment.timeLimit} min
                        </span>
                        <span className="flex items-center">
                          <FileText className="w-4 h-4 mr-1" />
                          {assessment.questions?.length || 0} questions
                        </span>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          assessment.difficulty === 'easy'
                            ? 'bg-green-100 text-green-800'
                            : assessment.difficulty === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {assessment.difficulty}
                      </span>
                    </div>

                    {/* Attempts (only when not completed) */}
                    {!assessment.isCompleted && (
                      <div className="p-3 mb-4 rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Attempts:</span>
                          <span
                            className={`font-medium ${
                              assessment.chancesRemaining === 0 ? 'text-red-600' : 'text-blue-600'
                            }`}
                          >
                            {assessment.chancesUsed}/{assessment.chances || 1}
                          </span>
                        </div>
                        {assessment.chancesRemaining > 0 && (
                          <div className="mt-1 text-xs text-gray-500">
                            {assessment.chancesRemaining} attempt{assessment.chancesRemaining !== 1 ? 's' : ''} remaining
                          </div>
                        )}
                      </div>
                    )}

                    {/* Completed details */}
                    {assessment.isCompleted ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-green-100 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-green-800">Final Score</span>
                            <span className={`text-lg font-bold ${getScoreColor(assessment.userScore)}`}>
                              {assessment.userScore}%
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-green-800">
                            <div>Avg exec time: <strong>{assessment.avgExecMs ?? 0} ms</strong></div>
                            <div className="flex items-center justify-end">
                              <Calendar className="w-3 h-3 mr-1" />
                              {assessment.completedAt ? assessment.completedAt.toLocaleDateString() : '—'}
                            </div>
                          </div>
                        </div>

                        <button
                          className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 transition-colors bg-gray-100 rounded-lg hover:bg-gray-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewResults(assessment.id);
                          }}
                        >
                          <TrendingUp className="w-4 h-4 mr-2" />
                          View Results
                        </button>
                      </div>
                    ) : (
                      <button
                        className={`flex items-center justify-center w-full px-4 py-3 font-medium text-white transition-colors rounded-lg ${
                          assessment.canRetake ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartAssessment(assessment.id);
                        }}
                      >
                        {assessment.canRetake ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Retake Assessment
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Start Assessment
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Submissions (only for incomplete assessments) */}
        {submissions.length > 0 && (
          <div className="p-6 bg-white shadow-sm rounded-xl">
            <h3 className="mb-4 text-xl font-bold text-gray-900">Recent Submissions</h3>
            <div className="space-y-3">
              {submissions.slice(0, 5).map((submission) => {
                const assessment = assessments.find(a => a.id === submission.assessmentId);
                return (
                  <div key={submission.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{assessment?.title || 'Unknown Assessment'}</h4>
                      <p className="text-sm text-gray-500">
                        {submission.submittedAt ? submission.submittedAt.toLocaleDateString() : 'Unknown date'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreBadgeColor(submission.score)}`}>
                        {submission.score}%
                      </span>
                      <span className="text-sm text-gray-500">
                        {submission.passedTests || 0}/{submission.totalTests || 0} tests
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
