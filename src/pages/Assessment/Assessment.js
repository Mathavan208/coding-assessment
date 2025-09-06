import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useProctoring } from '../../hooks/useProctoring';
import { 
  Clock, 
  FileText, 
  Target, 
  Play, 
  AlertTriangle,
  CheckCircle,
  Users,
  BookOpen
} from 'lucide-react';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';
import gsap from 'gsap';

const Assessment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isStarted, setIsStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sessionId] = useState(`session_${Date.now()}`);
  
  const { violations, isMonitoring } = useProctoring(sessionId, isStarted);

  useEffect(() => {
    fetchAssessmentData();
    
    // GSAP animations
    gsap.timeline()
      .fromTo('.assessment-header', 
        { y: -50, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out' }
      )
      .fromTo('.assessment-card', 
        { y: 30, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out' }, 
        '-=0.4'
      );
  }, [id]);

  useEffect(() => {
    let timer;
    if (isStarted && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isStarted, timeRemaining]);

  const fetchAssessmentData = async () => {
    try {
      // Fetch assessment
      const assessmentDoc = await getDoc(doc(db, 'assessments', id));
      if (!assessmentDoc.exists()) {
        toast.error('Assessment not found');
        navigate('/');
        return;
      }

      const assessmentData = {
        id: assessmentDoc.id,
        ...assessmentDoc.data()
      };

      // Check if user is enrolled in the course
      if (!userProfile?.enrolledCourses?.includes(assessmentData.courseId)) {
        toast.error('You are not enrolled in this course');
        navigate('/');
        return;
      }

      setAssessment(assessmentData);
      setTimeRemaining(assessmentData.timeLimit * 60); // Convert to seconds

      // Fetch questions
      if (assessmentData.questions && assessmentData.questions.length > 0) {
        const questionPromises = assessmentData.questions.map(questionId =>
          getDoc(doc(db, 'questions', questionId))
        );
        
        const questionDocs = await Promise.all(questionPromises);
        const questionsData = questionDocs
          .filter(doc => doc.exists())
          .map(doc => ({ id: doc.id, ...doc.data() }));
        
        setQuestions(questionsData);
      }
    } catch (error) {
      console.error('Error fetching assessment:', error);
      toast.error('Failed to load assessment');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAssessment = () => {
    if (questions.length === 0) {
      toast.error('No questions available for this assessment');
      return;
    }

    setIsStarted(true);
    navigate(`/code/${id}/${questions[0].id}`);
  };

  const handleTimeUp = () => {
    toast.error('Time\'s up! Assessment automatically submitted.');
    navigate('/');
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (!timeRemaining) return 'text-gray-600';
    const percentage = (timeRemaining / (assessment?.timeLimit * 60)) * 100;
    
    if (percentage > 50) return 'text-green-600';
    if (percentage > 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="xl" text="Loading assessment..." />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Assessment Not Found</h2>
          <p className="mb-4 text-gray-600">The requested assessment could not be found.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-4xl px-4 mx-auto">
        {/* Header */}
        <div className="mb-8 text-center assessment-header">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">{assessment.title}</h1>
          <p className="mb-6 text-xl text-gray-600">{assessment.description}</p>
          
          {/* Assessment Info Cards */}
          <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-4">
            <div className="p-4 bg-white border rounded-lg shadow-sm assessment-card">
              <div className="flex items-center justify-center mb-2">
                <BookOpen className="w-6 h-6 mr-2 text-blue-500" />
                <span className="font-medium text-gray-900">Course</span>
              </div>
              <p className="text-lg font-bold text-blue-600">
                {assessment.courseId?.toUpperCase()}
              </p>
            </div>

            <div className="p-4 bg-white border rounded-lg shadow-sm assessment-card">
              <div className="flex items-center justify-center mb-2">
                <Clock className="w-6 h-6 mr-2 text-green-500" />
                <span className="font-medium text-gray-900">Time Limit</span>
              </div>
              <p className="text-lg font-bold text-green-600">
                {assessment.timeLimit} minutes
              </p>
            </div>

            <div className="p-4 bg-white border rounded-lg shadow-sm assessment-card">
              <div className="flex items-center justify-center mb-2">
                <Target className="w-6 h-6 mr-2 text-orange-500" />
                <span className="font-medium text-gray-900">Max Marks</span>
              </div>
              <p className="text-lg font-bold text-orange-600">
                {assessment.maxMarks}
              </p>
            </div>

            <div className="p-4 bg-white border rounded-lg shadow-sm assessment-card">
              <div className="flex items-center justify-center mb-2">
                <FileText className="w-6 h-6 mr-2 text-purple-500" />
                <span className="font-medium text-gray-900">Questions</span>
              </div>
              <p className="text-lg font-bold text-purple-600">
                {questions.length}
              </p>
            </div>
          </div>
        </div>

        {/* Timer (if started) */}
        {isStarted && (
          <div className="fixed z-50 p-4 bg-white border-2 border-gray-200 rounded-lg shadow-lg top-20 right-4">
            <div className="text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-gray-500" />
              <div className={`text-2xl font-bold ${getTimeColor()}`}>
                {formatTime(timeRemaining)}
              </div>
              <p className="text-xs text-gray-500">Time Remaining</p>
            </div>
          </div>
        )}

        {/* Proctoring Status */}
        {isMonitoring && violations.length > 0 && (
          <div className="fixed z-50 p-4 border border-red-200 rounded-lg shadow-lg top-20 left-4 bg-red-50">
            <div className="flex items-center mb-2">
              <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
              <span className="font-medium text-red-700">Proctoring Alert</span>
            </div>
            <p className="text-sm text-red-600">
              {violations.length} violation(s) detected
            </p>
          </div>
        )}

        {/* Main Content */}
        {!isStarted ? (
          // Pre-Assessment Screen
          <div className="p-8 bg-white border border-gray-200 shadow-lg assessment-card rounded-xl">
            <div className="mb-8 text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">Ready to Start?</h2>
              <p className="mb-6 text-gray-600">
                Please read the instructions carefully before beginning the assessment.
              </p>
            </div>

            {/* Instructions */}
            <div className="mb-8">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Instructions:</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  You have {assessment.timeLimit} minutes to complete all {questions.length} questions
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Each question has multiple test cases that will validate your solution
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  You can navigate between questions and save your progress
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  The assessment is being proctored - avoid switching tabs or copying content
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                  Once started, the timer cannot be paused
                </li>
              </ul>
            </div>

            {/* Questions Overview */}
            <div className="mb-8">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Questions Overview:</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {questions.map((question, index) => (
                  <div key={question.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        Question {index + 1}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                          question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {question.difficulty}
                        </span>
                        <span className="text-xs text-gray-500">
                          {question.marks} marks
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{question.title}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <div className="text-center">
              <button
                onClick={handleStartAssessment}
                className="flex items-center px-8 py-4 mx-auto text-lg font-medium text-white transition-all transform rounded-lg shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-105"
              >
                <Play className="w-6 h-6 mr-2" />
                Start Assessment
              </button>
              <p className="mt-4 text-sm text-gray-500">
                Click to begin your {assessment.timeLimit}-minute assessment
              </p>
            </div>
          </div>
        ) : (
          // Assessment in progress message (shouldn't normally be shown)
          <div className="p-8 text-center bg-white shadow-lg assessment-card rounded-xl">
            <LoadingSpinner size="lg" text="Loading coding environment..." />
          </div>
        )}
      </div>
    </div>
  );
};

export default Assessment;
