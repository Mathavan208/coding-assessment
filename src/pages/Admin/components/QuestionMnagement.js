import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Code,
  Target,
  Clock,
  TestTube,
  Copy
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../../components/UI/Modal';
import MonacoEditor from '../../../components/CodeEditor/MonacoEditor';
import DataTable from '../../../components/UI/DataTable';
const QuestionManagement = ({ searchTerm }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [viewingQuestion, setViewingQuestion] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    language: 'java',
    difficulty: 'easy',
    marks: 10,
    sampleInput: '',
    sampleOutput: '',
    constraints: '',
    hints: '',
    starterCode: '',
    testCases: [
      { input: '', expectedOutput: '', isHidden: false, marks: 5 }
    ]
  });

  const languages = ['java', 'python', 'sql'];
  const difficulties = ['easy', 'medium', 'hard'];

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const questionsSnapshot = await getDocs(
        query(collection(db, 'questions'), orderBy('createdAt', 'desc'))
      );
      const questionsData = questionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      setQuestions(questionsData);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const questionData = {
        ...formData,
        marks: Number(formData.marks),
        testCases: formData.testCases.map(tc => ({
          ...tc,
          marks: Number(tc.marks)
        })),
        createdAt: editingQuestion ? editingQuestion.createdAt : new Date(),
        updatedAt: new Date(),
        createdBy: 'current-admin-id' // Replace with actual admin ID
      };

      if (editingQuestion) {
        await updateDoc(doc(db, 'questions', editingQuestion.id), questionData);
        toast.success('Question updated successfully');
      } else {
        await addDoc(collection(db, 'questions'), questionData);
        toast.success('Question created successfully');
      }

      setShowModal(false);
      setEditingQuestion(null);
      resetForm();
      fetchQuestions();
    } catch (error) {
      console.error('Error saving question:', error);
      toast.error('Failed to save question');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'questions', questionId));
      toast.success('Question deleted successfully');
      fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question');
    }
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    setFormData({
      title: question.title || '',
      description: question.description || '',
      language: question.language || 'java',
      difficulty: question.difficulty || 'easy',
      marks: question.marks || 10,
      sampleInput: question.sampleInput || '',
      sampleOutput: question.sampleOutput || '',
      constraints: question.constraints || '',
      hints: question.hints || '',
      starterCode: question.starterCode || '',
      testCases: question.testCases || [
        { input: '', expectedOutput: '', isHidden: false, marks: 5 }
      ]
    });
    setShowModal(true);
  };

  const handleView = (question) => {
    setViewingQuestion(question);
  };

  const handleDuplicate = async (question) => {
    try {
      const duplicateData = {
        ...question,
        title: `${question.title} (Copy)`,
        createdAt: new Date(),
        createdBy: 'current-admin-id'
      };
      delete duplicateData.id;
      
      await addDoc(collection(db, 'questions'), duplicateData);
      toast.success('Question duplicated successfully');
      fetchQuestions();
    } catch (error) {
      console.error('Error duplicating question:', error);
      toast.error('Failed to duplicate question');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      language: 'java',
      difficulty: 'easy',
      marks: 10,
      sampleInput: '',
      sampleOutput: '',
      constraints: '',
      hints: '',
      starterCode: '',
      testCases: [
        { input: '', expectedOutput: '', isHidden: false, marks: 5 }
      ]
    });
  };

  const addTestCase = () => {
    setFormData(prev => ({
      ...prev,
      testCases: [
        ...prev.testCases,
        { input: '', expectedOutput: '', isHidden: false, marks: 5 }
      ]
    }));
  };

  const removeTestCase = (index) => {
    if (formData.testCases.length > 1) {
      setFormData(prev => ({
        ...prev,
        testCases: prev.testCases.filter((_, i) => i !== index)
      }));
    }
  };

  const updateTestCase = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      testCases: prev.testCases.map((testCase, i) => 
        i === index 
          ? { 
              ...testCase, 
              [field]: field === 'marks' ? Number(value) : value 
            }
          : testCase
      )
    }));
  };

  const getLanguageColor = (language) => {
    switch (language) {
      case 'java': return 'bg-red-100 text-red-800';
      case 'python': return 'bg-blue-100 text-blue-800';
      case 'sql': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredQuestions = questions.filter(question =>
    question.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    question.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    question.language?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      key: 'title',
      header: 'Question',
      render: (question) => (
        <div>
          <span className="font-medium">{question.title}</span>
          <p className="max-w-xs text-sm text-gray-500 truncate">
            {question.description}
          </p>
        </div>
      )
    },
    {
      key: 'language',
      header: 'Language',
      render: (question) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLanguageColor(question.language)}`}>
          {question.language?.toUpperCase()}
        </span>
      )
    },
    {
      key: 'difficulty',
      header: 'Difficulty',
      render: (question) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDifficultyColor(question.difficulty)}`}>
          {question.difficulty}
        </span>
      )
    },
    {
      key: 'marks',
      header: 'Marks',
      render: (question) => (
        <div className="flex items-center text-sm text-gray-600">
          <Target className="w-4 h-4 mr-1" />
          {question.marks}
        </div>
      )
    },
    {
      key: 'testCases',
      header: 'Test Cases',
      render: (question) => (
        <div className="flex items-center text-sm text-gray-600">
          <TestTube className="w-4 h-4 mr-1" />
          {question.testCases?.length || 0}
        </div>
      )
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (question) => (
        <span className="text-sm text-gray-600">
          {question.createdAt?.toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (question) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleView(question)}
            className="p-1 text-blue-600 hover:text-blue-800"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleEdit(question)}
            className="p-1 text-yellow-600 hover:text-yellow-800"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDuplicate(question)}
            className="p-1 text-green-600 hover:text-green-800"
            title="Duplicate"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(question.id)}
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
            Questions ({filteredQuestions.length})
          </h3>
          <p className="text-gray-600">Manage coding questions and test cases</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingQuestion(null);
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Question
        </button>
      </div>

      {/* Question Stats */}
      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-4">
        {languages.map(language => (
          <div key={language} className="p-4 bg-white border rounded-lg shadow-sm">
            <div className="flex items-center">
              <Code className={`w-8 h-8 mr-3 ${
                language === 'java' ? 'text-red-500' :
                language === 'python' ? 'text-blue-500' :
                'text-green-500'
              }`} />
              <div>
                <p className="text-sm text-gray-600 capitalize">{language}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {questions.filter(q => q.language === language).length}
                </p>
              </div>
            </div>
          </div>
        ))}
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center">
            <Target className="w-8 h-8 mr-3 text-purple-500" />
            <div>
              <p className="text-sm text-gray-600">Total Questions</p>
              <p className="text-2xl font-bold text-gray-900">{questions.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Questions Table */}
      <DataTable
        columns={columns}
        data={filteredQuestions}
        loading={loading}
        emptyMessage="No questions found"
      />

      {/* Add/Edit Question Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingQuestion(null);
          resetForm();
        }}
        title={editingQuestion ? 'Edit Question' : 'Add New Question'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Question Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Two Sum Problem"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Language *
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {languages.map(lang => (
                    <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Difficulty *
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {difficulties.map(diff => (
                    <option key={diff} value={diff}>{diff}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Marks *
                </label>
                <input
                  type="number"
                  value={formData.marks}
                  onChange={(e) => setFormData({ ...formData, marks: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  required
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Detailed problem description..."
              required
            />
          </div>

          {/* Sample Input/Output */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Sample Input
              </label>
              <textarea
                value={formData.sampleInput}
                onChange={(e) => setFormData({ ...formData, sampleInput: e.target.value })}
                className="w-full px-3 py-2 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Sample input..."
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Sample Output
              </label>
              <textarea
                value={formData.sampleOutput}
                onChange={(e) => setFormData({ ...formData, sampleOutput: e.target.value })}
                className="w-full px-3 py-2 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Sample output..."
              />
            </div>
          </div>

          {/* Constraints and Hints */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Constraints
              </label>
              <textarea
                value={formData.constraints}
                onChange={(e) => setFormData({ ...formData, constraints: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Problem constraints..."
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Hints
              </label>
              <textarea
                value={formData.hints}
                onChange={(e) => setFormData({ ...formData, hints: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Helpful hints..."
              />
            </div>
          </div>

          {/* Starter Code */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Starter Code
            </label>
            <textarea
              value={formData.starterCode}
              onChange={(e) => setFormData({ ...formData, starterCode: e.target.value })}
              className="w-full px-3 py-2 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={6}
              placeholder="Starter code template..."
            />
          </div>

          {/* Test Cases */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Test Cases ({formData.testCases.length})
              </label>
              <button
                type="button"
                onClick={addTestCase}
                className="px-3 py-1 text-sm text-white transition-colors bg-green-600 rounded hover:bg-green-700"
              >
                Add Test Case
              </button>
            </div>

            <div className="space-y-4">
              {formData.testCases.map((testCase, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Test Case {index + 1}</h4>
                    {formData.testCases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTestCase(index)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 mb-3 md:grid-cols-2">
                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-600">
                        Input
                      </label>
                      <textarea
                        value={testCase.input}
                        onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                        className="w-full px-3 py-2 font-mono text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                        placeholder="Test input..."
                      />
                    </div>

                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-600">
                        Expected Output
                      </label>
                      <textarea
                        value={testCase.expectedOutput}
                        onChange={(e) => updateTestCase(index, 'expectedOutput', e.target.value)}
                        className="w-full px-3 py-2 font-mono text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                        placeholder="Expected output..."
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={testCase.isHidden}
                          onChange={(e) => updateTestCase(index, 'isHidden', e.target.checked)}
                          className="text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Hidden Test Case</span>
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-700">Marks:</label>
                      <input
                        type="number"
                        value={testCase.marks}
                        onChange={(e) => updateTestCase(index, 'marks', e.target.value)}
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end pt-4 space-x-4 border-t">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingQuestion(null);
                resetForm();
              }}
              className="px-4 py-2 text-gray-700 transition-colors bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (editingQuestion ? 'Update Question' : 'Create Question')}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Question Modal */}
      <Modal
        isOpen={!!viewingQuestion}
        onClose={() => setViewingQuestion(null)}
        title="Question Details"
        size="xl"
      >
        {viewingQuestion && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-xl font-semibold">{viewingQuestion.title}</h3>
              <div className="flex items-center mb-4 space-x-2">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLanguageColor(viewingQuestion.language)}`}>
                  {viewingQuestion.language?.toUpperCase()}
                </span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDifficultyColor(viewingQuestion.difficulty)}`}>
                  {viewingQuestion.difficulty}
                </span>
                <span className="inline-flex px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">
                  {viewingQuestion.marks} marks
                </span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{viewingQuestion.description}</p>
            </div>

            {(viewingQuestion.sampleInput || viewingQuestion.sampleOutput) && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {viewingQuestion.sampleInput && (
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Sample Input</label>
                    <pre className="p-3 font-mono text-sm whitespace-pre-wrap bg-gray-100 rounded-lg">
                      {viewingQuestion.sampleInput}
                    </pre>
                  </div>
                )}
                {viewingQuestion.sampleOutput && (
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Sample Output</label>
                    <pre className="p-3 font-mono text-sm whitespace-pre-wrap bg-gray-100 rounded-lg">
                      {viewingQuestion.sampleOutput}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {(viewingQuestion.constraints || viewingQuestion.hints) && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {viewingQuestion.constraints && (
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Constraints</label>
                    <p className="p-3 text-sm text-gray-600 whitespace-pre-wrap rounded-lg bg-gray-50">
                      {viewingQuestion.constraints}
                    </p>
                  </div>
                )}
                {viewingQuestion.hints && (
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Hints</label>
                    <p className="p-3 text-sm text-gray-600 whitespace-pre-wrap rounded-lg bg-gray-50">
                      {viewingQuestion.hints}
                    </p>
                  </div>
                )}
              </div>
            )}

            {viewingQuestion.starterCode && (
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Starter Code</label>
                <pre className="p-4 overflow-x-auto font-mono text-sm text-green-400 bg-gray-900 rounded-lg">
                  {viewingQuestion.starterCode}
                </pre>
              </div>
            )}

            {viewingQuestion.testCases && viewingQuestion.testCases.length > 0 && (
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Test Cases ({viewingQuestion.testCases.length})
                </label>
                <div className="space-y-3">
                  {viewingQuestion.testCases.map((testCase, index) => (
                    <div key={index} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Test Case {index + 1}</span>
                        <div className="flex items-center space-x-2">
                          {testCase.isHidden && (
                            <span className="px-2 py-1 text-xs text-yellow-800 bg-yellow-100 rounded">
                              Hidden
                            </span>
                          )}
                          <span className="px-2 py-1 text-xs text-blue-800 bg-blue-100 rounded">
                            {testCase.marks} marks
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                          <label className="block mb-1 text-xs font-medium text-gray-600">Input</label>
                          <pre className="p-2 font-mono text-xs whitespace-pre-wrap rounded bg-gray-50">
                            {testCase.input || 'No input'}
                          </pre>
                        </div>
                        <div>
                          <label className="block mb-1 text-xs font-medium text-gray-600">Expected Output</label>
                          <pre className="p-2 font-mono text-xs whitespace-pre-wrap rounded bg-gray-50">
                            {testCase.expectedOutput || 'No output'}
                          </pre>
                        </div>
                      </div>
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

export default QuestionManagement;
