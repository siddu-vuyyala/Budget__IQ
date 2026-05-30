import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Trash2, Edit2, X, Briefcase, Gift, Landmark, TrendingUp } from 'lucide-react';
import { SERVER_URL, authenticatedFetch } from '../../../utils';
import { toast } from 'sonner';

interface Income {
  id?: string;
  source: string;
  amount: number;
  frequency?: 'monthly' | 'yearly' | 'one-time';
  category?: 'salary' | 'investment' | 'gift' | 'other';
  date?: string;
  percentage: number;
}

const categoryIcons = {
  salary: Briefcase,
  investment: TrendingUp,
  gift: Gift,
  other: Landmark
};

export const IncomeTab = () => {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<string | null>(null); // stores id
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    source: '',
    amount: '',
    percentage: '',
    frequency: 'monthly',
    category: 'salary',
    date: new Date().toISOString().split('T')[0]
  });

  // Load incomes from backend on component mount
  useEffect(() => {
    const fetchIncomes = async () => {
      try {
        setLoading(true);
        const response = await authenticatedFetch(`${SERVER_URL}/income`, { method: 'GET' });
        if (!response.ok) {
          if (response.status === 401) {
            toast.error('Session expired. Please login again.');
            return;
          }
          throw new Error('Failed to fetch income');
        }
        const data = await response.json();
        const normalize = (item: any, idx: number) => ({
          id: item.id || item._id || item.source?.toString().replace(/\s+/g, '_').toLowerCase() || Math.random().toString(36).substr(2,9),
          source: item.source || item.name || `Income ${idx+1}`,
          amount: Number(item.amount || item.value || 0),
          percentage: Number(item.percentage || 0),
          frequency: item.frequency || 'monthly',
          category: item.category || 'other',
          date: item.date || new Date().toISOString().split('T')[0]
        });

        const incomeData = Array.isArray(data) && data.length > 0 ? data.map(normalize) : [
          { source: 'Salary', amount: 80000, percentage: 70, category: 'salary', frequency: 'monthly' },
          { source: 'Investments', amount: 25000, percentage: 22, category: 'investment', frequency: 'monthly' },
          { source: 'Other', amount: 9000, percentage: 8, category: 'other', frequency: 'monthly' }
        ].map(normalize);
        setIncomes(incomeData);
      } catch (error) {
        console.error('Error loading incomes from backend:', error);
        setIncomes([
          { id: Math.random().toString(36).substr(2,9), source: 'Salary', amount: 80000, percentage: 70, category: 'salary', frequency: 'monthly' },
          { id: Math.random().toString(36).substr(2,9), source: 'Investments', amount: 25000, percentage: 22, category: 'investment', frequency: 'monthly' },
          { id: Math.random().toString(36).substr(2,9), source: 'Other', amount: 9000, percentage: 8, category: 'other', frequency: 'monthly' }
        ]);
        toast.error('Failed to load income data. Showing default data.');
      } finally {
        setLoading(false);
      }
    };

    fetchIncomes();
  }, []);

  // Save incomes to backend whenever they change
  useEffect(() => {
    if (incomes.length > 0) {
      const saveIncomes = async () => {
        try {
          await authenticatedFetch(`${SERVER_URL}/income`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(incomes)
          });
        } catch (error) {
          console.error('Error saving incomes to backend:', error);
          toast.error('Failed to save income data');
        }
      };

      saveIncomes();
    }
  }, [incomes]);

  const handleAdd = () => {
    setIsEditing(false);
    setFormData({
      source: '',
      amount: '',
      percentage: '',
      frequency: 'monthly',
      category: 'salary',
      date: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleEdit = (income: Income) => {
    setIsEditing(true);
    setSelectedIncome(income.id || null);
    setFormData({
      source: income.source,
      amount: income.amount.toString(),
      percentage: income.percentage.toString(),
      frequency: income.frequency || 'monthly',
      category: income.category || 'salary',
      date: income.date || new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string | undefined) => {
    if (!id) return;
    setIncomes(incomes.filter(income => income.id !== id));
    toast.success('Income removed');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newIncome: Income = {
      source: formData.source,
      amount: parseFloat(formData.amount),
      percentage: parseFloat(formData.percentage),
      frequency: formData.frequency as 'monthly' | 'yearly' | 'one-time',
      category: formData.category as 'salary' | 'investment' | 'gift' | 'other',
      date: formData.date
    };

    if (isEditing && selectedIncome) {
      setIncomes(incomes.map(income => income.id === selectedIncome ? { ...newIncome, id: selectedIncome } : income));
      toast.success('Income updated');
    } else {
      setIncomes([...incomes, { ...newIncome, id: Math.random().toString(36).substr(2,9) }]);
      toast.success('Income added');
    }

    setIsModalOpen(false);
  };

  const getTotalMonthlyIncome = () => {
    return incomes.reduce((total, income) => {
      const amount = income.amount;
      switch (income.frequency) {
        case 'monthly':
          return total + amount;
        case 'yearly':
          return total + amount / 12;
        case 'one-time':
          return total;
        default:
          return total;
      }
    }, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const fillDemoData = () => {
    const demoIncomes = [
      {
        source: "Software Engineer Salary",
        amount: "150000",
        frequency: "monthly",
        category: "salary",
        date: new Date().toISOString().split('T')[0]
      },
      {
        source: "Stock Market Returns",
        amount: "50000",
        frequency: "monthly",
        category: "investment",
        date: new Date().toISOString().split('T')[0]
      },
      {
        source: "Freelance Project",
        amount: "200000",
        frequency: "one-time",
        category: "other",
        date: new Date().toISOString().split('T')[0]
      },
      {
        source: "Dividend Income",
        amount: "75000",
        frequency: "yearly",
        category: "investment",
        date: new Date().toISOString().split('T')[0]
      }
    ];

    const randomIncome = demoIncomes[Math.floor(Math.random() * demoIncomes.length)];
    setFormData({
      ...formData,
      ...randomIncome
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 space-y-8">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white">
          <h3 className="text-lg font-medium opacity-90">Total Monthly Income</h3>
          <div className="mt-4 flex items-baseline">
            <span className="text-3xl font-bold">{formatCurrency(getTotalMonthlyIncome())}</span>
            <span className="ml-2 text-sm opacity-75">/month</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Sources</h4>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{incomes.length}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Yearly Total</h4>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              {formatCurrency(getTotalMonthlyIncome() * 12)}
            </p>
          </div>
        </div>
      </div>

      {/* Income List */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Income Sources</h2>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Income
          </button>
        </div>

        <div className="space-y-4">
          {incomes.map((income, idx) => {
            const Icon = categoryIcons[income.category] || Landmark;
            const key = income.id || income.source || `income-${idx}`;
            return (
              <div
                key={key}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${
                      income.category === 'salary' ? 'bg-green-100 text-green-600' :
                      income.category === 'investment' ? 'bg-blue-100 text-blue-600' :
                      income.category === 'gift' ? 'bg-purple-100 text-purple-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{income.source}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {income.frequency.charAt(0).toUpperCase() + income.frequency.slice(1)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(income.amount)}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(income)}
                        className="p-1 text-gray-400 hover:text-gray-500"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(income.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {isEditing ? 'Edit Income Source' : 'Add Income Source'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Source Name
                </label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400">₹</span>
                  </div>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full pl-10 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Frequency
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="one-time">One-time</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
                  >
                    <option value="salary">Salary</option>
                    <option value="investment">Investment</option>
                    <option value="gift">Gift</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
                  required
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={fillDemoData}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Demo Data
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {isEditing ? 'Save Changes' : 'Add Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}; 