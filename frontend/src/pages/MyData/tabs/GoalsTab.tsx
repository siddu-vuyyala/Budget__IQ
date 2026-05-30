import React, { useState, useEffect } from 'react';
import { Target, Plus, Trash2, Edit2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SERVER_URL, authenticatedFetch } from '../../../utils';
import { toast } from 'sonner';

interface Goal {
  id?: string;
  name: string;
  target: number;
  current: number;
  timeline: string;
}

const formatToINR = (amount: string | number) => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[₹,]/g, '')) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(numericAmount);
};

export const GoalsTab = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    target: '',
    current: '',
    timeline: ''
  });

  // Load goals from backend on component mount
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        setLoading(true);
        const response = await authenticatedFetch(`${SERVER_URL}/goals`, { method: 'GET' });
        if (!response.ok) {
          if (response.status === 401) {
            toast.error('Session expired. Please login again.');
            return;
          }
          throw new Error('Failed to fetch goals');
        }
        const data = await response.json();
        const normalize = (item: any, idx: number) => ({
          id: item.id || item._id || item.name?.toString().replace(/\s+/g, '_').toLowerCase() || Math.random().toString(36).substr(2,9),
          name: item.name || `Goal ${idx+1}`,
          target: Number(item.target || 0),
          current: Number(item.current || 0),
          timeline: item.timeline || ''
        });

        const goalData = Array.isArray(data) && data.length > 0 ? data.map(normalize) : [
          { name: 'Retirement', target: 10000000, current: 500000, timeline: '25 years' },
          { name: 'Child Education', target: 3000000, current: 1200000, timeline: '10 years' },
          { name: 'Vacation', target: 500000, current: 125000, timeline: '2 years' }
        ].map(normalize);
        setGoals(goalData);
      } catch (error) {
        console.error('Error loading goals from backend:', error);
        setGoals([
          { id: Math.random().toString(36).substr(2,9), name: 'Retirement', target: 10000000, current: 500000, timeline: '25 years' },
          { id: Math.random().toString(36).substr(2,9), name: 'Child Education', target: 3000000, current: 1200000, timeline: '10 years' },
          { id: Math.random().toString(36).substr(2,9), name: 'Vacation', target: 500000, current: 125000, timeline: '2 years' }
        ]);
        toast.error('Failed to load goal data. Showing default data.');
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, []);

  // Save goals to backend whenever they change
  useEffect(() => {
    if (goals.length > 0) {
      const saveGoals = async () => {
        try {
          await authenticatedFetch(`${SERVER_URL}/goals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(goals)
          });
        } catch (error) {
          console.error('Error saving goals to backend:', error);
        }
      };

      saveGoals();
    }
  }, [goals]);

  const handleAdd = () => {
    setIsEditing(false);
    setSelectedIndex(null);
    setFormData({ name: '', target: '', current: '', timeline: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (index: number) => {
    const goal = goals[index];
    setIsEditing(true);
    setSelectedIndex(index);
    setFormData({
      name: goal.name,
      target: goal.target.toString(),
      current: goal.current.toString(),
      timeline: goal.timeline
    });
    setIsModalOpen(true);
  };

  const handleDelete = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
    toast.success('Goal removed');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newGoal: Goal = {
      name: formData.name,
      target: parseFloat(formData.target),
      current: parseFloat(formData.current),
      timeline: formData.timeline
    };

    if (isEditing && selectedIndex !== null) {
      const updatedGoals = [...goals];
      updatedGoals[selectedIndex] = newGoal;
      setGoals(updatedGoals);
      toast.success('Goal updated');
    } else {
      setGoals([...goals, newGoal]);
      toast.success('Goal added');
    }

    setIsModalOpen(false);
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-600">Loading goals...</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Financial Goals</h2>
            <p className="mt-2 text-indigo-100">Track and manage your financial aspirations</p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAdd}
            className="inline-flex items-center px-6 py-3 bg-white text-indigo-600 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Goal
          </motion.button>
        </div>
        
        <div className="grid grid-cols-3 gap-6 mt-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-indigo-100">Total Goals</p>
            <p className="text-3xl font-bold mt-1">{goals.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-indigo-100">Active Goals</p>
            <p className="text-3xl font-bold mt-1">{goals.filter(g => calculateProgress(g.current, g.target) < 100).length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-indigo-100">Completed</p>
            <p className="text-3xl font-bold mt-1">{goals.filter(g => calculateProgress(g.current, g.target) >= 100).length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {goals.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="col-span-full p-8 text-center bg-white dark:bg-gray-800 rounded-2xl"
            >
              <Target className="h-12 w-12 text-indigo-600 dark:text-indigo-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No goals added yet.</p>
            </motion.div>
          ) : (
            goals.map((goal, index) => {
              const progress = calculateProgress(goal.current, goal.target);
              return (
                <motion.div
                  key={goal.id || index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{goal.name}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(index)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(index)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Target</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatToINR(goal.target)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Saved</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">{formatToINR(goal.current)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Timeline</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{goal.timeline}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Progress</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full"
                      />
                    </div>
                  </div>

                  {progress >= 100 && (
                    <div className="mt-4 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400">✓ Completed!</p>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {isEditing ? 'Edit Goal' : 'Add Goal'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Goal Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., House Down Payment"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target</label>
                    <input
                      type="number"
                      value={formData.target}
                      onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                      placeholder="1000000"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current</label>
                    <input
                      type="number"
                      value={formData.current}
                      onChange={(e) => setFormData({ ...formData, current: e.target.value })}
                      placeholder="500000"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Timeline</label>
                  <input
                    type="text"
                    value={formData.timeline}
                    onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                    placeholder="e.g., 3 years"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                  >
                    {isEditing ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
