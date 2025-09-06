import React, { useState, useEffect } from 'react';
import bcrypt from 'bcryptjs';
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
  Mail, 
  Shield, 
  User,
  Calendar,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../../components/UI/Modal';
import DataTable from '../../../components/UI/DataTable';
const UserManagement = ({ searchTerm }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'student',
    enrolledCourses: []
  });

  const courses = ['java', 'python', 'sql'];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const usersSnapshot = await getDocs(
        query(collection(db, 'users'), orderBy('createdAt', 'desc'))
      );
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        lastLogin: doc.data().lastLogin?.toDate() || new Date()
      }));
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    if (editingUser) {
      // Update existing user
      await updateDoc(doc(db, 'users', editingUser.id), {
        ...formData,
        updatedAt: new Date()
      });
      toast.success('User updated successfully');
    } else {
      // Create new user with hashed password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash('defaultPassword123', saltRounds);
      
      const userData = {
        ...formData,
        passwordHash: passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null
      };

      await addDoc(collection(db, 'users'), userData);
      toast.success('User created successfully with default password: defaultPassword123');
    }

    setShowModal(false);
    setEditingUser(null);
    resetForm();
    fetchUsers();
  } catch (error) {
    console.error('Error saving user:', error);
    toast.error('Failed to save user: ' + error.message);
  } finally {
    setLoading(false);
  }
};



  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', userId));
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'student',
      enrolledCourses: user.enrolledCourses || []
    });
    setShowModal(true);
  };

  const handleView = (user) => {
    setViewingUser(user);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'student',
      enrolledCourses: []
    });
  };

  const handleCourseToggle = (course) => {
    setFormData(prev => ({
      ...prev,
      enrolledCourses: prev.enrolledCourses.includes(course)
        ? prev.enrolledCourses.filter(c => c !== course)
        : [...prev.enrolledCourses, course]
    }));
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (user) => (
        <div className="flex items-center">
          <div className="flex items-center justify-center w-8 h-8 mr-3 text-sm font-medium text-white bg-blue-500 rounded-full">
            {user.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <span className="font-medium">{user.name || 'N/A'}</span>
        </div>
      )
    },
    {
      key: 'email',
      header: 'Email',
      render: (user) => (
        <span className="text-gray-600">{user.email}</span>
      )
    },
    {
      key: 'role',
      header: 'Role',
      render: (user) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          user.role === 'admin' 
            ? 'bg-red-100 text-red-800' 
            : 'bg-green-100 text-green-800'
        }`}>
          {user.role}
        </span>
      )
    },
    {
      key: 'enrolledCourses',
      header: 'Courses',
      render: (user) => (
        <div className="flex flex-wrap gap-1">
          {user.enrolledCourses?.map((course) => (
            <span key={course} className="px-2 py-1 text-xs text-blue-800 bg-blue-100 rounded">
              {course.toUpperCase()}
            </span>
          )) || <span className="text-gray-400">No courses</span>}
        </div>
      )
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      render: (user) => (
        <span className="text-sm text-gray-600">
          {user.lastLogin?.toLocaleDateString() || 'Never'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleView(user)}
            className="p-1 text-blue-600 hover:text-blue-800"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleEdit(user)}
            className="p-1 text-yellow-600 hover:text-yellow-800"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(user.id)}
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
            Users ({filteredUsers.length})
          </h3>
          <p className="text-gray-600">Manage system users and their permissions</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingUser(null);
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </button>
      </div>

      {/* Users Table */}
      <DataTable
        columns={columns}
        data={filteredUsers}
        loading={loading}
        emptyMessage="No users found"
      />

      {/* Add/Edit User Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingUser(null);
          resetForm();
        }}
        title={editingUser ? 'Edit User' : 'Add New User'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Enrolled Courses
            </label>
            <div className="space-y-2">
              {courses.map((course) => (
                <label key={course} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.enrolledCourses.includes(course)}
                    onChange={() => handleCourseToggle(course)}
                    className="text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm capitalize">{course}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4 space-x-4">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingUser(null);
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
              {loading ? 'Saving...' : (editingUser ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </Modal>

      {/* View User Modal */}
      <Modal
        isOpen={!!viewingUser}
        onClose={() => setViewingUser(null)}
        title="User Details"
      >
        {viewingUser && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-16 h-16 text-2xl font-bold text-white bg-blue-500 rounded-full">
                {viewingUser.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div>
                <h3 className="text-xl font-semibold">{viewingUser.name}</h3>
                <p className="text-gray-600">{viewingUser.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Role
                </label>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  viewingUser.role === 'admin' 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {viewingUser.role}
                </span>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Created At
                </label>
                <p className="text-sm text-gray-600">
                  {viewingUser.createdAt?.toLocaleDateString()}
                </p>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Last Login
                </label>
                <p className="text-sm text-gray-600">
                  {viewingUser.lastLogin?.toLocaleDateString() || 'Never'}
                </p>
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Enrolled Courses
              </label>
              <div className="flex flex-wrap gap-2">
                {viewingUser.enrolledCourses?.map((course) => (
                  <span key={course} className="px-3 py-1 text-sm text-blue-800 bg-blue-100 rounded-full">
                    {course.toUpperCase()}
                  </span>
                )) || <span className="text-gray-400">No courses enrolled</span>}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UserManagement;
