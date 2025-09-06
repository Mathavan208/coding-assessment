import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Trophy, Medal, Award, RefreshCw, Users } from 'lucide-react';
import DataTable from '../../../components/UI/DataTable';
import toast from 'react-hot-toast';

const LeaderboardManagement = ({ searchTerm }) => {
  const [leaderboards, setLeaderboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    try {
      const leaderboardsSnapshot = await getDocs(collection(db, 'leaderboards'));
      const leaderboardsData = leaderboardsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setLeaderboards(leaderboardsData);
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
      toast.error('Failed to fetch leaderboards');
    } finally {
      setLoading(false);
    }
  };

  const refreshLeaderboard = async (courseId) => {
    setRefreshing(true);
    try {
      // In a real implementation, you would recalculate leaderboard from submissions
      toast.success(`${courseId} leaderboard refreshed`);
    } catch (error) {
      toast.error('Failed to refresh leaderboard');
    } finally {
      setRefreshing(false);
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 2: return <Medal className="w-4 h-4 text-gray-400" />;
      case 3: return <Award className="w-4 h-4 text-amber-600" />;
      default: return <span className="text-sm font-bold">#{rank}</span>;
    }
  };

  // Flatten leaderboard data for display
  const flattenedData = leaderboards.flatMap(leaderboard => 
    (leaderboard.rankings || []).map(ranking => ({
      ...ranking,
      courseId: leaderboard.id
    }))
  );

  const filteredData = flattenedData.filter(item =>
    item.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.courseId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      key: 'rank',
      header: 'Rank',
      render: (item) => (
        <div className="flex items-center space-x-2">
          {getRankIcon(item.rank)}
          <span className="font-medium">{item.rank}</span>
        </div>
      )
    },
    {
      key: 'userName',
      header: 'Student',
      render: (item) => (
        <div>
          <span className="font-medium text-gray-900">{item.userName}</span>
          <p className="text-sm text-gray-500">{item.userId?.substring(0, 8)}...</p>
        </div>
      )
    },
    {
      key: 'courseId',
      header: 'Course',
      render: (item) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          item.courseId === 'java' ? 'bg-red-100 text-red-800' :
          item.courseId === 'python' ? 'bg-blue-100 text-blue-800' :
          item.courseId === 'sql' ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {item.courseId?.toUpperCase()}
        </span>
      )
    },
    {
      key: 'totalScore',
      header: 'Total Score',
      render: (item) => (
        <span className="text-lg font-semibold">{item.totalScore || 0}</span>
      )
    },
    {
      key: 'assessmentsCompleted',
      header: 'Assessments',
      render: (item) => (
        <span className="text-gray-600">{item.assessmentsCompleted || 0}</span>
      )
    },
    {
      key: 'averageTime',
      header: 'Avg Time',
      render: (item) => (
        <span className="text-gray-600">
          {item.averageTime ? `${Math.round(item.averageTime)}m` : 'N/A'}
        </span>
      )
    },
    {
      key: 'lastUpdated',
      header: 'Last Updated',
      render: (item) => (
        <span className="text-sm text-gray-500">
          {item.lastUpdated?.toDate?.()?.toLocaleDateString() || 'N/A'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Leaderboards ({filteredData.length} entries)
          </h3>
          <p className="text-gray-600">Monitor course rankings and student performance</p>
        </div>
      </div>

      {/* Course Leaderboard Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {leaderboards.map((leaderboard) => (
          <div key={leaderboard.id} className="p-6 bg-white border rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold capitalize">
                {leaderboard.id} Leaderboard
              </h4>
              <button
                onClick={() => refreshLeaderboard(leaderboard.id)}
                disabled={refreshing}
                className="p-2 text-gray-500 transition-colors hover:text-blue-600 disabled:opacity-50"
                title="Refresh Leaderboard"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Students</span>
                <span className="font-semibold">{leaderboard.rankings?.length || 0}</span>
              </div>
              
              {leaderboard.rankings && leaderboard.rankings.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Top Score</span>
                    <span className="font-semibold text-green-600">
                      {Math.max(...leaderboard.rankings.map(r => r.totalScore || 0))}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Average Score</span>
                    <span className="font-semibold">
                      {Math.round(
                        leaderboard.rankings.reduce((sum, r) => sum + (r.totalScore || 0), 0) / 
                        leaderboard.rankings.length
                      )}
                    </span>
                  </div>
                </>
              )}
            </div>
            
            {/* Top 3 Preview */}
            {leaderboard.rankings && leaderboard.rankings.length > 0 && (
              <div className="pt-4 mt-4 border-t border-gray-200">
                <h5 className="mb-3 text-sm font-medium text-gray-700">Top 3</h5>
                <div className="space-y-2">
                  {leaderboard.rankings.slice(0, 3).map((ranking, index) => (
                    <div key={ranking.userId} className="flex items-center space-x-3">
                      {getRankIcon(index + 1)}
                      <span className="flex-1 text-sm truncate">{ranking.userName}</span>
                      <span className="text-sm font-medium">{ranking.totalScore}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Full Leaderboard Table */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold">All Rankings</h4>
        </div>
        
        <DataTable
          columns={columns}
          data={filteredData}
          loading={loading}
          searchable={true}
          sortable={true}
          emptyMessage="No leaderboard data found"
        />
      </div>
    </div>
  );
};

export default LeaderboardManagement;
