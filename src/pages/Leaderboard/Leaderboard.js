import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
  Users, 
  Trophy, 
  Medal, 
  Crown,
  Star,
  Calendar,
  TrendingUp,
  Filter,
  User
} from 'lucide-react';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';
import gsap from 'gsap';

const Leaderboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [leaders, setLeaders] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentUserRank, setCurrentUserRank] = useState(null);

  useEffect(() => {
    fetchAssessments();
  }, []);

  useEffect(() => {
    if (selectedAssessment) {
      fetchLeaders(selectedAssessment.id);
    }
  }, [selectedAssessment]);

  useEffect(() => {
    // GSAP animations
    gsap.fromTo('.leaderboard-header', 
      { opacity: 0, y: -30 }, 
      { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }
    );
    
    gsap.fromTo('.leader-card', 
      { opacity: 0, x: -20 }, 
      { opacity: 1, x: 0, duration: 0.5, stagger: 0.1, delay: 0.3 }
    );
  }, [leaders]);

  const fetchAssessments = async () => {
    try {
      const assessmentsSnapshot = await getDocs(collection(db, 'assessments'));
      const assessmentsData = assessmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setAssessments(assessmentsData);
      
      if (assessmentsData.length > 0) {
        setSelectedAssessment(assessmentsData[0]);
      }
      
    } catch (error) {
      console.error('Error fetching assessments:', error);
      toast.error('Failed to load assessments');
    }
  };

  const fetchLeaders = async (assessmentId) => {
    setLoading(true);
    try {
      // Get the best submission per user for this assessment
      const submissionsQuery = query(
        collection(db, 'submissions'),
        where('assessmentId', '==', assessmentId)
      );
      
      const submissionsSnapshot = await getDocs(submissionsQuery);
      const userBestScores = {};
      const userSubmissions = {};
      
      submissionsSnapshot.forEach((doc) => {
        const data = doc.data();
        const userId = data.userId;
        const score = data.score || 0;
        
        if (!userBestScores[userId] || score > userBestScores[userId]) {
          userBestScores[userId] = score;
          userSubmissions[userId] = {
            id: doc.id,
            ...data,
            submittedAt: data.submittedAt
          };
        }
      });

      // Convert to sorted array
      const leadersArray = Object.entries(userBestScores)
        .map(([userId, score]) => ({
          userId,
          score,
          ...userSubmissions[userId]
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 50); // Top 50 users

      setLeaders(leadersArray);
      
      // Find current user's rank
      const userRank = leadersArray.findIndex(leader => leader.userId === user?.uid);
      setCurrentUserRank(userRank >= 0 ? userRank + 1 : null);
      
      // Fetch user names
      await fetchUserNames(leadersArray.map(leader => leader.userId));
      
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserNames = async (userIds) => {
    const names = {};
    
    try {
      const userPromises = userIds.map(async (userId) => {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          names[userId] = userDoc.data().name || 'Unknown User';
        } else {
          names[userId] = 'Unknown User';
        }
      });
      
      await Promise.all(userPromises);
      setUserNames(names);
      
    } catch (error) {
      console.error('Error fetching user names:', error);
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-orange-600" />;
      default:
        return <span className="flex items-center justify-center w-6 h-6 text-sm font-bold text-gray-600">#{rank}</span>;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBadgeColor = (score) => {
    if (score >= 90) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 80) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (score >= 60) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const formatDate = (dateField) => {
    if (!dateField) return 'Unknown';
    
    let date;
    if (typeof dateField.toDate === 'function') {
      date = dateField.toDate();
    } else if (typeof dateField === 'string') {
      date = new Date(dateField);
    } else if (dateField instanceof Date) {
      date = dateField;
    } else {
      return 'Unknown';
    }
    
    return date.toLocaleDateString();
  };

  if (loading && !selectedAssessment) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <LoadingSpinner size="xl" text="Loading leaderboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm leaderboard-header">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
                <p className="text-gray-600">Top performers across all assessments</p>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 transition-colors bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Assessment Selector */}
        <div className="p-6 mb-8 bg-white shadow-sm rounded-xl">
          <div className="flex items-center mb-4 space-x-3">
            <Filter className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Select Assessment</h2>
          </div>
          
          <select
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={selectedAssessment?.id || ''}
            onChange={(e) => {
              const assessment = assessments.find(a => a.id === e.target.value);
              setSelectedAssessment(assessment);
            }}
          >
            <option value="">Choose an assessment...</option>
            {assessments.map((assessment) => (
              <option key={assessment.id} value={assessment.id}>
                {assessment.title} ({assessment.difficulty})
              </option>
            ))}
          </select>
          
          {selectedAssessment && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
              <span>Assessment: <strong>{selectedAssessment.title}</strong></span>
              <span>Total Leaders: <strong>{leaders.length}</strong></span>
              {currentUserRank && (
                <span>Your Rank: <strong className="text-blue-600">#{currentUserRank}</strong></span>
              )}
            </div>
          )}
        </div>

        {/* Leaders List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" text="Loading leaders..." />
          </div>
        ) : !selectedAssessment ? (
          <div className="py-12 text-center bg-white shadow-sm rounded-xl">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">Select an Assessment</h3>
            <p className="text-gray-500">Choose an assessment to view the leaderboard</p>
          </div>
        ) : leaders.length === 0 ? (
          <div className="py-12 text-center bg-white shadow-sm rounded-xl">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">No Submissions Yet</h3>
            <p className="text-gray-500">Be the first to complete this assessment!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top 3 Podium */}
            {leaders.length >= 3 && (
              <div className="p-6 mb-8 bg-white shadow-sm rounded-xl">
                <h3 className="mb-6 text-xl font-bold text-center text-gray-900">🏆 Top 3 Performers 🏆</h3>
                <div className="flex items-end justify-center space-x-8">
                  {/* 2nd Place */}
                  <div className="text-center">
                    <div className="flex items-center justify-center w-20 h-20 mx-auto mb-3 bg-gray-100 border-4 border-gray-300 rounded-full">
                      <Medal className="w-10 h-10 text-gray-400" />
                    </div>
                    <h4 className="font-semibold text-gray-900">{userNames[leaders[1]?.userId] || 'Unknown'}</h4>
                    <p className={`text-lg font-bold ${getScoreColor(leaders[1]?.score)}`}>{leaders[1]?.score}%</p>
                    <p className="text-xs text-gray-500">2nd Place</p>
                  </div>

                  {/* 1st Place */}
                  <div className="text-center">
                    <div className="flex items-center justify-center w-24 h-24 mx-auto mb-3 bg-yellow-100 border-4 border-yellow-300 rounded-full">
                      <Crown className="w-12 h-12 text-yellow-500" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">{userNames[leaders[0]?.userId] || 'Unknown'}</h4>
                    <p className={`text-xl font-bold ${getScoreColor(leaders[0]?.score)}`}>{leaders[0]?.score}%</p>
                    <p className="text-sm font-medium text-yellow-600">🥇 Champion</p>
                  </div>

                  {/* 3rd Place */}
                  <div className="text-center">
                    <div className="flex items-center justify-center w-20 h-20 mx-auto mb-3 bg-orange-100 border-4 border-orange-300 rounded-full">
                      <Medal className="w-10 h-10 text-orange-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900">{userNames[leaders[2]?.userId] || 'Unknown'}</h4>
                    <p className={`text-lg font-bold ${getScoreColor(leaders[2]?.score)}`}>{leaders[2]?.score}%</p>
                    <p className="text-xs text-gray-500">3rd Place</p>
                  </div>
                </div>
              </div>
            )}

            {/* Full Leaderboard */}
            <div className="overflow-hidden bg-white shadow-sm rounded-xl">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Complete Rankings</h3>
              </div>
              
              <div className="divide-y divide-gray-200">
                {leaders.map((leader, index) => (
                  <div
                    key={leader.userId}
                    className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer leader-card ${
                      leader.userId === user?.uid ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                    onClick={() => navigate(`/profile/${leader.userId}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* Rank */}
                        <div className="flex-shrink-0">
                          {getRankIcon(index + 1)}
                        </div>
                        
                        {/* User Info */}
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full">
                            <User className="w-6 h-6 text-gray-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {userNames[leader.userId] || 'Loading...'}
                              {leader.userId === user?.uid && (
                                <span className="px-2 py-1 ml-2 text-xs text-blue-800 bg-blue-100 rounded-full">You</span>
                              )}
                            </h4>
                            <p className="text-sm text-gray-500">User ID: {leader.userId.substring(0, 8)}...</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Score and Stats */}
                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${getScoreColor(leader.score)}`}>
                            {leader.score}%
                          </div>
                          <div className="text-xs text-gray-500">
                            {leader.passedTests || 0}/{leader.totalTests || 0} tests
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(leader.submittedAt)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {leader.executionTime || 0}ms execution
                          </div>
                        </div>
                        
                        <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getScoreBadgeColor(leader.score)}`}>
                          Rank #{index + 1}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
