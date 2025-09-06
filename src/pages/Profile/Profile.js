import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { 
  User, 
  Mail, 
  Calendar, 
  Trophy, 
  Target, 
  Star,
  TrendingUp,
  CheckCircle,
  Award
} from 'lucide-react';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';

const Profile = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isOwnProfile = currentUser?.uid === userId;

  // ✅ Use optimized Cloud Function
  const getUserProfile = httpsCallable(functions, 'getUserProfile');

  useEffect(() => {
    if (userId) {
      fetchOptimizedProfile();
    }
  }, [userId]);

  const fetchOptimizedProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📋 Fetching optimized profile...');
      
      // ✅ Single optimized function call
      const result = await getUserProfile({ userId });
      
      if (result.data) {
        setProfile(result.data);
        console.log('✅ Profile loaded successfully');
      } else {
        throw new Error('No profile data received');
      }
      
    } catch (error) {
      console.error('❌ Error fetching profile:', error);
      setError(error.message);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeColor = (score) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 80) return 'bg-blue-100 text-blue-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <LoadingSpinner size="xl" text="Loading profile..." />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <User className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Profile Not Found</h2>
          <p className="mb-4 text-gray-600">{error || 'Unable to load profile data'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
                <User className="text-white w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {isOwnProfile ? 'My Profile' : `${profile.name}'s Profile`}
                </h1>
                <p className="text-gray-600">
                  {isOwnProfile ? 'Your performance overview' : 'User profile and achievements'}
                </p>
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
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Profile Info */}
          <div className="lg:col-span-1">
            <div className="p-6 bg-white shadow-sm rounded-xl">
              <div className="mb-6 text-center">
                <div className="flex items-center justify-center w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
                  <User className="w-12 h-12 text-white" />
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900">{profile.name}</h2>
                <p className="text-gray-600 capitalize">{profile.role || 'Student'}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-gray-600">
                  <Mail className="w-5 h-5" />
                  <span className="text-sm">{profile.email}</span>
                </div>
                
                <div className="flex items-center space-x-3 text-gray-600">
                  <Calendar className="w-5 h-5" />
                  <span className="text-sm">
                    Joined {profile.createdAt ? new Date(profile.createdAt.toDate ? profile.createdAt.toDate() : profile.createdAt).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-3 text-gray-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm">
                    {profile.stats?.totalAssessments || 0} Assessments Completed
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-white shadow-sm rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Average Score</p>
                    <p className={`text-2xl font-bold ${getScoreColor(profile.stats?.averageScore || 0)}`}>
                      {profile.stats?.averageScore || 0}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white shadow-sm rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Trophy className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Best Score</p>
                    <p className={`text-2xl font-bold ${getScoreColor(profile.stats?.bestScore || 0)}`}>
                      {profile.stats?.bestScore || 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Completed Assessments */}
          <div className="lg:col-span-2">
            <div className="p-6 bg-white shadow-sm rounded-xl">
              <h3 className="flex items-center mb-6 text-xl font-bold text-gray-900">
                <Award className="w-6 h-6 mr-2 text-yellow-600" />
                Recent Completed Assessments
              </h3>
              
              {!profile.completedAssessments || profile.completedAssessments.length === 0 ? (
                <div className="py-8 text-center">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h4 className="mb-2 text-lg font-medium text-gray-900">No Completed Assessments</h4>
                  <p className="text-gray-500">
                    {isOwnProfile ? 'Start taking assessments to see your progress here' : 'This user hasn\'t completed any assessments yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {profile.completedAssessments.map((assessment) => (
                    <div
                      key={assessment.id}
                      className="p-4 transition-colors border border-gray-200 rounded-lg hover:border-blue-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{assessment.title}</h4>
                          <div className="flex items-center mt-1 space-x-3">
                            <span className="flex items-center text-sm text-gray-500">
                              <Star className="w-4 h-4 mr-1" />
                              {assessment.difficulty}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreBadgeColor(assessment.score)}`}>
                            {assessment.score}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {profile.stats?.totalAssessments > 5 && (
                    <div className="pt-4 text-center">
                      <p className="text-sm text-gray-500">
                        Showing recent 5 of {profile.stats.totalAssessments} completed assessments
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
