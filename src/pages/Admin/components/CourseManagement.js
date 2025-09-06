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
  BookOpen,
  Users,
  FileText,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../../components/UI/Modal';
import DataTable from '../../../components/UI/DataTable';
const CourseManagement = ({ searchTerm }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [viewingCourse, setViewingCourse] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    isActive: true
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const coursesSnapshot = await getDocs(
        query(collection(db, 'courses'), orderBy('createdAt', 'desc'))
      );
      const coursesData = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      setCourses(coursesData);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const courseData = {
        ...formData,
        code: formData.code.toLowerCase(),
        createdAt: editingCourse ? editingCourse.createdAt : new Date(),
        updatedAt: new Date()
      };

      if (editingCourse) {
        await updateDoc(doc(db, 'courses', editingCourse.id), courseData);
        toast.success('Course updated successfully');
      } else {
        await addDoc(collection(db, 'courses'), courseData);
        toast.success('Course created successfully');
      }

      setShowModal(false);
      setEditingCourse(null);
      resetForm();
      fetchCourses();
    } catch (error) {
      console.error('Error saving course:', error);
      toast.error('Failed to save course');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'courses', courseId));
      toast.success('Course deleted successfully');
      fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course');
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name || '',
      code: course.code || '',
      description: course.description || '',
      isActive: course.isActive !== false
    });
    setShowModal(true);
  };

  const handleView = (course) => {
    setViewingCourse(course);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      isActive: true
    });
  };

  const filteredCourses = courses.filter(course =>
    course.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      key: 'name',
      header: 'Course Name',
      render: (course) => (
        <div className="flex items-center">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-medium mr-3 ${
            course.code === 'java' ? 'bg-red-500' :
            course.code === 'python' ? 'bg-blue-500' :
            course.code === 'sql' ? 'bg-green-500' :
            'bg-gray-500'
          }`}>
            {course.code?.charAt(0)?.toUpperCase() || 'C'}
          </div>
          <div>
            <span className="font-medium">{course.name}</span>
            <p className="text-sm text-gray-500">{course.code?.toUpperCase()}</p>
          </div>
        </div>
      )
    },
    {
      key: 'description',
      header: 'Description',
      render: (course) => (
        <span className="block max-w-xs text-gray-600 truncate">
          {course.description || 'No description'}
        </span>
      )
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (course) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          course.isActive !== false
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {course.isActive !== false ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (course) => (
        <span className="text-sm text-gray-600">
          {course.createdAt?.toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (course) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleView(course)}
            className="p-1 text-blue-600 hover:text-blue-800"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleEdit(course)}
            className="p-1 text-yellow-600 hover:text-yellow-800"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(course.id)}
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
            Courses ({filteredCourses.length})
          </h3>
          <p className="text-gray-600">Manage programming language courses</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingCourse(null);
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Course
        </button>
      </div>

      {/* Course Stats Cards */}
      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-4">
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center">
            <BookOpen className="w-8 h-8 mr-3 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600">Total Courses</p>
              <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center">
            <Users className="w-8 h-8 mr-3 text-green-500" />
            <div>
              <p className="text-sm text-gray-600">Active Courses</p>
              <p className="text-2xl font-bold text-gray-900">
                {courses.filter(c => c.isActive !== false).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Courses Table */}
      <DataTable
        columns={columns}
        data={filteredCourses}
        loading={loading}
        emptyMessage="No courses found"
      />

      {/* Add/Edit Course Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingCourse(null);
          resetForm();
        }}
        title={editingCourse ? 'Edit Course' : 'Add New Course'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Course Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Java Programming"
              required
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Course Code
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., java"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Use lowercase letters (java, python, sql)
            </p>
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
              placeholder="Course description..."
            />
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
              Active Course
            </label>
          </div>

          <div className="flex justify-end pt-4 space-x-4">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingCourse(null);
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
              {loading ? 'Saving...' : (editingCourse ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Course Modal */}
      <Modal
        isOpen={!!viewingCourse}
        onClose={() => setViewingCourse(null)}
        title="Course Details"
      >
        {viewingCourse && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-white text-2xl font-bold ${
                viewingCourse.code === 'java' ? 'bg-red-500' :
                viewingCourse.code === 'python' ? 'bg-blue-500' :
                viewingCourse.code === 'sql' ? 'bg-green-500' :
                'bg-gray-500'
              }`}>
                {viewingCourse.code?.charAt(0)?.toUpperCase() || 'C'}
              </div>
              <div>
                <h3 className="text-xl font-semibold">{viewingCourse.name}</h3>
                <p className="text-gray-600">{viewingCourse.code?.toUpperCase()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Status
                </label>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  viewingCourse.isActive !== false
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {viewingCourse.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Created At
                </label>
                <p className="text-sm text-gray-600">
                  {viewingCourse.createdAt?.toLocaleDateString()}
                </p>
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Description
              </label>
              <p className="p-3 text-gray-700 rounded-lg bg-gray-50">
                {viewingCourse.description || 'No description available'}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CourseManagement;
