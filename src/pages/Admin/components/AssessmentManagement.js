import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  where 
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  FileText,
  Clock,
  Target,
  BookOpen,
  Calendar,
  RotateCcw // ✅ Add icon for chances
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../../components/UI/Modal';
import DataTable from '../../../components/UI/DataTable';

const AssessmentManagement = ({ searchTerm }) => {
  const [assessments, setAssessments] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [viewingAssessment, setViewingAssessment] = useState(null);
  
  // ✅ Updated formData with chances field
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseId: '',
    difficulty: 'easy',
    timeLimit: 60,
    maxMarks: 100,
    isActive: true,
    questions: [],
    chances: 1 // ✅ New field with default value 1
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch assessments
      const assessmentsSnapshot = await getDocs(
        query(collection(db, 'assessments'), orderBy('createdAt', 'desc'))
      );
      const assessmentsData = assessmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      setAssessments(assessmentsData);

      // Fetch questions
      const questionsSnapshot = await getDocs(collection(db, 'questions'));
      const questionsData = questionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setQuestions(questionsData);

      // Fetch courses
      const coursesSnapshot = await getDocs(collection(db, 'courses'));
      const coursesData = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(coursesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ Updated assessmentData with chances field
      const assessmentData = {
        ...formData,
        timeLimit: Number(formData.timeLimit),
        maxMarks: Number(formData.maxMarks),
        chances: Number(formData.chances) || 1, // ✅ Save chances as number
        createdAt: editingAssessment ? editingAssessment.createdAt : new Date(),
        updatedAt: new Date(),
        createdBy: 'current-admin-id' // Replace with actual admin ID
      };

      if (editingAssessment) {
        await updateDoc(doc(db, 'assessments', editingAssessment.id), assessmentData);
        toast.success('Assessment updated successfully');
      } else {
        await addDoc(collection(db, 'assessments'), assessmentData);
        toast.success('Assessment created successfully');
      }

      setShowModal(false);
      setEditingAssessment(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving assessment:', error);
      toast.error('Failed to save assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (assessmentId) => {
    if (!window.confirm('Are you sure you want to delete this assessment?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'assessments', assessmentId));
      toast.success('Assessment deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting assessment:', error);
      toast.error('Failed to delete assessment');
    }
  };

  // ✅ Updated handleEdit to include chances field
  const handleEdit = (assessment) => {
    setEditingAssessment(assessment);
    setFormData({
      title: assessment.title || '',
      description: assessment.description || '',
      courseId: assessment.courseId || '',
      difficulty: assessment.difficulty || 'easy',
      timeLimit: assessment.timeLimit || 60,
      maxMarks: assessment.maxMarks || 100,
      isActive: assessment.isActive !== false,
      questions: assessment.questions || [],
      chances: assessment.chances || 1 // ✅ Load chances value or default to 1
    });
    setShowModal(true);
  };

  const handleView = (assessment) => {
    setViewingAssessment(assessment);
  };

  // ✅ Updated resetForm to include chances field
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      courseId: '',
      difficulty: 'easy',
      timeLimit: 60,
      maxMarks: 100,
      isActive: true,
      questions: [],
      chances: 1 // ✅ Reset chances to default 1
    });
  };

  const handleQuestionToggle = (questionId) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.includes(questionId)
        ? prev.questions.filter(q => q !== questionId)
        : [...prev.questions, questionId]
    }));
  };

  // Get available questions for selected course
  const availableQuestions = questions.filter(q => 
    q.language === formData.courseId || !formData.courseId
  );

  const filteredAssessments = assessments.filter(assessment =>
    assessment.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assessment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assessment.courseId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ Updated columns with chances field
  const columns = [
    {
      key: 'title',
      header: 'Assessment',
      render: (assessment) => (
        <div>
          <span className="font-medium">{assessment.title}</span>
          <p className="max-w-xs text-sm text-gray-500 truncate">
            {assessment.description}
          </p>
        </div>
      )
    },
    {
      key: 'courseId',
      header: 'Course',
      render: (assessment) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          assessment.courseId === 'java' ? 'bg-red-100 text-red-800' :
          assessment.courseId === 'python' ? 'bg-blue-100 text-blue-800' :
          assessment.courseId === 'sql' ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {assessment.courseId?.toUpperCase()}
        </span>
      )
    },
    {
      key: 'difficulty',
      header: 'Difficulty',
      render: (assessment) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          assessment.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
          assessment.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {assessment.difficulty}
        </span>
      )
    },
    {
      key: 'timeLimit',
      header: 'Time Limit',
      render: (assessment) => (
        <div className="flex items-center text-sm text-gray-600">
          <Clock className="w-4 h-4 mr-1" />
          {assessment.timeLimit} mins
        </div>
      )
    },
    {
      key: 'maxMarks',
      header: 'Max Marks',
      render: (assessment) => (
        <div className="flex items-center text-sm text-gray-600">
          <Target className="w-4 h-4 mr-1" />
          {assessment.maxMarks}
        </div>
      )
    },
    // ✅ New Chances column
    {
      key: 'chances',
      header: 'Chances',
      render: (assessment) => (
        <div className="flex items-center text-sm text-gray-600">
          <RotateCcw className="w-4 h-4 mr-1" />
          {assessment.chances || 1}
        </div>
      )
    },
    {
      key: 'questions',
      header: 'Questions',
      render: (assessment) => (
        <span className="text-sm text-gray-600">
          {assessment.questions?.length || 0} questions
        </span>
      )
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (assessment) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          assessment.isActive !== false
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {assessment.isActive !== false ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (assessment) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleView(assessment)}
            className="p-1 text-blue-600 hover:text-blue-800"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleEdit(assessment)}
            className="p-1 text-yellow-600 hover:text-yellow-800"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(assessment.id)}
            className="p-1 text-red-600 hover:text-red-800"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Actions Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Assessments ({filteredAssessments.length})
          </h3>
          <p className="text-gray-600">Manage coding assessments and tests</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingAssessment(null);
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Assessment
        </button>
      </div>

      {/* Assessment Stats */}
      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-4">
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center">
            <FileText className="w-8 h-8 mr-3 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600">Total Assessments</p>
              <p className="text-2xl font-bold text-gray-900">{assessments.length}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center">
            <Target className="w-8 h-8 mr-3 text-green-500" />
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">
                {assessments.filter(a => a.isActive !== false).length}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center">
            <Clock className="w-8 h-8 mr-3 text-orange-500" />
            <div>
              <p className="text-sm text-gray-600">Avg Time Limit</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(assessments.reduce((sum, a) => sum + (a.timeLimit || 0), 0) / assessments.length || 0)}m
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center">
            <BookOpen className="w-8 h-8 mr-3 text-purple-500" />
            <div>
              <p className="text-sm text-gray-600">Total Questions</p>
              <p className="text-2xl font-bold text-gray-900">
                {assessments.reduce((sum, a) => sum + (a.questions?.length || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Assessments Table */}
      <DataTable
        columns={columns}
        data={filteredAssessments}
        loading={loading}
        emptyMessage="No assessments found"
      />

      {/* Add/Edit Assessment Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingAssessment(null);
          resetForm();
        }}
        title={editingAssessment ? 'Edit Assessment' : 'Add New Assessment'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Assessment Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Java Basics Test"
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Course
              </label>
              <select
                value={formData.courseId}
                onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.code}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Assessment description..."
            />
          </div>

          {/* ✅ Updated grid to include chances field - now 4 columns */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Difficulty
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Time Limit (minutes)
              </label>
              <input
                type="number"
                value={formData.timeLimit}
                onChange={(e) => setFormData({ ...formData, timeLimit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Max Marks
              </label>
              <input
                type="number"
                value={formData.maxMarks}
                onChange={(e) => setFormData({ ...formData, maxMarks: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                required
              />
            </div>

            {/* ✅ New Chances input field */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Chances
              </label>
              <input
                type="number"
                value={formData.chances}
                onChange={(e) => setFormData({ ...formData, chances: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                max="10"
                required
                placeholder="1"
              />
              <p className="mt-1 text-xs text-gray-500">
                Number of attempts allowed (1-10)
              </p>
            </div>
          </div>

          {/* Questions Selection */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Select Questions ({formData.questions.length} selected)
            </label>
            <div className="p-3 overflow-y-auto border border-gray-300 rounded-lg max-h-60">
              {availableQuestions.length === 0 ? (
                <p className="py-4 text-center text-gray-500">
                  {formData.courseId ? 'No questions available for selected course' : 'Please select a course first'}
                </p>
              ) : (
                <div className="space-y-2">
                  {availableQuestions.map((question) => (
                    <label key={question.id} className="flex items-start p-2 space-x-3 rounded hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.questions.includes(question.id)}
                        onChange={() => handleQuestionToggle(question.id)}
                        className="mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{question.title}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {question.description}
                        </p>
                        <div className="flex items-center mt-1 space-x-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {question.difficulty}
                          </span>
                          <span className="text-xs text-gray-500">{question.marks} marks</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
              Active Assessment
            </label>
          </div>

          <div className="flex justify-end pt-4 space-x-4">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingAssessment(null);
                resetForm();
              }}
              className="px-4 py-2 text-gray-700 transition-colors bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (editingAssessment ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Assessment Modal */}
      <Modal
        isOpen={!!viewingAssessment}
        onClose={() => setViewingAssessment(null)}
        title="Assessment Details"
        size="lg"
      >
        {viewingAssessment && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-xl font-semibold">{viewingAssessment.title}</h3>
              <p className="text-gray-600">{viewingAssessment.description}</p>
            </div>

            {/* ✅ Updated grid to include chances - now 5 columns */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <div className="p-3 rounded-lg bg-gray-50">
                <label className="block mb-1 text-sm font-medium text-gray-700">Course</label>
                <span className="text-sm font-semibold text-blue-600">
                  {viewingAssessment.courseId?.toUpperCase()}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-gray-50">
                <label className="block mb-1 text-sm font-medium text-gray-700">Difficulty</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  viewingAssessment.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                  viewingAssessment.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {viewingAssessment.difficulty}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-gray-50">
                <label className="block mb-1 text-sm font-medium text-gray-700">Time Limit</label>
                <span className="text-sm font-semibold">{viewingAssessment.timeLimit} minutes</span>
              </div>

              <div className="p-3 rounded-lg bg-gray-50">
                <label className="block mb-1 text-sm font-medium text-gray-700">Max Marks</label>
                <span className="text-sm font-semibold">{viewingAssessment.maxMarks}</span>
              </div>

              {/* ✅ New Chances display in view modal */}
              <div className="p-3 rounded-lg bg-gray-50">
                <label className="block mb-1 text-sm font-medium text-gray-700">Chances</label>
                <span className="text-sm font-semibold">{viewingAssessment.chances || 1}</span>
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Questions ({viewingAssessment.questions?.length || 0})
              </label>
              <div className="p-4 overflow-y-auto border border-gray-200 rounded-lg max-h-60">
                {viewingAssessment.questions?.length === 0 ? (
                  <p className="text-center text-gray-500">No questions assigned</p>
                ) : (
                  <div className="space-y-2">
                    {viewingAssessment.questions?.map((questionId, index) => {
                      const question = questions.find(q => q.id === questionId);
                      return question ? (
                        <div key={questionId} className="flex items-center justify-between p-2 rounded bg-gray-50">
                          <div>
                            <p className="text-sm font-medium">{question.title}</p>
                            <p className="text-xs text-gray-500">{question.marks} marks</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {question.difficulty}
                          </span>
                        </div>
                      ) : (
                        <div key={questionId} className="p-2 text-sm text-red-600 rounded bg-red-50">
                          Question not found (ID: {questionId})
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AssessmentManagement;
