import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, RadarChart, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  Wallet, TrendingUp, ArrowUpRight, DollarSign, 
  Target, AlertTriangle, Shield, X, CheckCircle, Plus, Trash2, Edit2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SERVER_URL, authenticatedFetch } from '../utils';
import Loader from '../components/Loader';
import { toast } from 'sonner';

interface RiskMetrics {
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  beta: number;
  alpha: number;
}

interface Liability {
  type: string;
  amount: number;
  monthlyPayment: number;
  interestRate: number;
  paid: number;
  isSecured: boolean;
  description: string;
}

interface Activity {
  type: string;
  amount: string;
  date: string;
  status: string;
  category?: string;
  balance?: string;
}

interface PortfolioData {
  portfolio: { totalValue: number; monthlyReturns: number; riskScore: number; goalProgress: number; monthlyChange: number; returnsChange: number };
  monthlyData: Array<{ name: string; value: number; expenses: number; savings: number }>;
  assetAllocation: Array<{ name: string; value: number; amount: number; color: string }>;
  incomeStreams: Array<{ source: string; amount: number; percentage: number }>;
  expenseCategories: Array<{ category: string; amount: number; percentage: number }>;
  liabilities: Liability[];
  investmentGoals: Array<{ name: string; target: number; current: number; timeline: string }>;
  recentActivity: Activity[];
}

interface RiskMetricsWithScore extends RiskMetrics {
  riskScore: number;
}

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const Portfolio = () => {
  const navigate = useNavigate();
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRebalanceModalOpen, setIsRebalanceModalOpen] = useState(false);
  const [rebalanceMessage, setRebalanceMessage] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [quickEditMode, setQuickEditMode] = useState(false);
  const [editPortfolioSummary, setEditPortfolioSummary] = useState({
    totalValue: 0,
    monthlyReturns: 0,
    riskScore: 0,
    goalProgress: 0,
    monthlyChange: 0,
    returnsChange: 0
  });
  const [editMonthlyData, setEditMonthlyData] = useState<Array<{ name: string; value: number; expenses: number; savings: number }>>([]);
  const [editAssetAllocation, setEditAssetAllocation] = useState<Array<{ name: string; value: number; amount: number; color: string }>>([]);
  const [editIncomeStreams, setEditIncomeStreams] = useState<Array<{ source: string; amount: number; percentage: number }>>([]);
  const [editExpenseCategories, setEditExpenseCategories] = useState<Array<{ category: string; amount: number; percentage: number }>>([]);
  const [editGoals, setEditGoals] = useState<Array<{ name: string; target: number; current: number; timeline: string }>>([]);
  const [editLiabilities, setEditLiabilities] = useState<Liability[]>([]);
  const [assetEditIndex, setAssetEditIndex] = useState<number | null>(null);
  const [tempEditedAsset, setTempEditedAsset] = useState<{ name: string; value: number; amount: number; color: string } | null>(null);
  const [liabilityEditIndex, setLiabilityEditIndex] = useState<number | null>(null);
  const [tempEditedLiability, setTempEditedLiability] = useState<Liability | null>(null);
  const [incomeEditIndex, setIncomeEditIndex] = useState<number | null>(null);
  const [tempEditedIncome, setTempEditedIncome] = useState<{ source: string; amount: number; percentage: number } | null>(null);
  const [expenseEditIndex, setExpenseEditIndex] = useState<number | null>(null);
  const [tempEditedExpense, setTempEditedExpense] = useState<{ category: string; amount: number; percentage: number } | null>(null);
  const [goalEditIndex, setGoalEditIndex] = useState<number | null>(null);
  const [tempEditedGoal, setTempEditedGoal] = useState<{ name: string; target: number; current: number; timeline: string } | null>(null);

  // Fetch data from backend with session authentication
  // Fetch data from backend with session authentication
  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch(`${SERVER_URL}/user/data`, { method: 'GET' });
      if (!response.ok) throw new Error('Failed to fetch portfolio data');
      const data = await response.json();
      setPortfolioData(data);
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      toast.error('Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolioData();
    // listen for global updates when other pages modify user data
    const handler = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail || {};
        if (detail.portfolioData) {
          setPortfolioData(detail.portfolioData);
        } else {
          fetchPortfolioData();
        }
      } catch (e) {
        fetchPortfolioData();
      }
    };
    window.addEventListener('portfolioUpdated', handler as EventListener);
    return () => window.removeEventListener('portfolioUpdated', handler as EventListener);
  }, []);

  // Open edit modal and prefill JSON areas
  const openEditModal = () => {
    setEditPortfolioSummary({
      totalValue: portfolio.totalValue,
      monthlyReturns: portfolio.monthlyReturns,
      riskScore: portfolio.riskScore,
      goalProgress: portfolio.goalProgress,
      monthlyChange: portfolio.monthlyChange,
      returnsChange: portfolio.returnsChange
    });
    setEditMonthlyData([...safeMonthlyData]);
    setEditAssetAllocation([...safeAssetAllocation]);
    setEditIncomeStreams([...safeIncomeStreams]);
    setEditExpenseCategories([...safeExpenseCategories]);
    setEditGoals([...safeInvestmentGoals]);
    setEditLiabilities([...safeLiabilities]);
    setIsEditModalOpen(true);
  };

  const saveSection = async (endpoint: string, payload: any) => {
    try {
      const res = await authenticatedFetch(`${SERVER_URL}${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Saved successfully');
      // Refresh data
      const r2 = await authenticatedFetch(`${SERVER_URL}/user/data`, { method: 'GET' });
      if (r2.ok) setPortfolioData(await r2.json());
    } catch (err) {
      console.error(err);
      toast.error('Failed to save data');
    }
  };

  // Inline edit helpers for quick editing
  const startEditAsset = (index: number) => {
    setAssetEditIndex(index);
    const asset = safeAssetAllocation[index];
    setTempEditedAsset({ name: asset.name, value: Number(asset.value) || 0, amount: Number(asset.amount) || 0, color: asset.color || '#4F46E5' });
  };

  const cancelEditAsset = () => {
    setAssetEditIndex(null);
    setTempEditedAsset(null);
  };

  const saveAssetInline = async (index: number) => {
    if (!tempEditedAsset) return;
    const newAssets = safeAssetAllocation.map((a, i) => i === index ? { ...a, ...tempEditedAsset } : a);
    await saveSection('/portfolio/assets', newAssets);
    setAssetEditIndex(null);
    setTempEditedAsset(null);
  };

  const startEditLiability = (index: number) => {
    setLiabilityEditIndex(index);
    const li = safeLiabilities[index];
    setTempEditedLiability({ ...li });
  };

  const cancelEditLiability = () => {
    setLiabilityEditIndex(null);
    setTempEditedLiability(null);
  };

  const saveLiabilityInline = async (index: number) => {
    if (!tempEditedLiability) return;
    const newLiabilities = safeLiabilities.map((l, i) => i === index ? { ...l, ...tempEditedLiability } : l);
    await saveSection('/liabilities', newLiabilities);
    setLiabilityEditIndex(null);
    setTempEditedLiability(null);
  };

  // Income inline edit
  const startEditIncome = (index: number) => {
    setIncomeEditIndex(index);
    const inc = safeIncomeStreams[index];
    setTempEditedIncome({ source: inc.source, amount: Number(inc.amount) || 0, percentage: Number(inc.percentage) || 0 });
  };
  const cancelEditIncome = () => { setIncomeEditIndex(null); setTempEditedIncome(null); };
  const saveIncomeInline = async (index: number) => {
    if (!tempEditedIncome) return;
    const newIncome = safeIncomeStreams.map((i, idx) => idx === index ? { ...i, ...tempEditedIncome } : i);
    await saveSection('/income', newIncome);
    setIncomeEditIndex(null); setTempEditedIncome(null);
  };

  // Expense inline edit
  const startEditExpense = (index: number) => {
    setExpenseEditIndex(index);
    const ex = safeExpenseCategories[index];
    setTempEditedExpense({ category: ex.category, amount: Number(ex.amount) || 0, percentage: Number(ex.percentage) || 0 });
  };
  const cancelEditExpense = () => { setExpenseEditIndex(null); setTempEditedExpense(null); };
  const saveExpenseInline = async (index: number) => {
    if (!tempEditedExpense) return;
    const newExpenses = safeExpenseCategories.map((e, idx) => idx === index ? { ...e, ...tempEditedExpense } : e);
    await saveSection('/expenses', newExpenses);
    setExpenseEditIndex(null); setTempEditedExpense(null);
  };

  // Goals inline edit
  const startEditGoal = (index: number) => {
    setGoalEditIndex(index);
    const g = safeInvestmentGoals[index];
    setTempEditedGoal({ name: g.name, target: Number(g.target) || 0, current: Number(g.current) || 0, timeline: g.timeline || '' });
  };
  const cancelEditGoal = () => { setGoalEditIndex(null); setTempEditedGoal(null); };
  const saveGoalInline = async (index: number) => {
    if (!tempEditedGoal) return;
    const newGoals = safeInvestmentGoals.map((g, idx) => idx === index ? { ...g, ...tempEditedGoal } : g);
    await saveSection('/goals', newGoals);
    setGoalEditIndex(null); setTempEditedGoal(null);
  };

  const handleSaveAll = async () => {
    try {
      await saveSection('/portfolio', { portfolio: editPortfolioSummary });
      await saveSection('/portfolio/monthly', editMonthlyData);
      await saveSection('/portfolio/assets', editAssetAllocation);
      await saveSection('/income', editIncomeStreams);
      await saveSection('/expenses', editExpenseCategories);
      await saveSection('/goals', editGoals);
      await saveSection('/liabilities', editLiabilities);
      setIsEditModalOpen(false);
    } catch (e) {
      console.error('Save failed', e);
      toast.error('Failed to save one or more sections');
    }
  };

  if (loading) return <Loader />;
  if (!portfolioData) return <div className="p-6 text-center text-gray-600">Failed to load portfolio data</div>;

  const { portfolio, monthlyData, assetAllocation, liabilities, investmentGoals, incomeStreams, recentActivity } = portfolioData;
  const safeMonthlyData = asArray<{ name: string; value: number; expenses: number; savings: number }>(monthlyData);
  const safeAssetAllocation = asArray<{ name: string; value: number; amount: number; color: string }>(assetAllocation);
  const safeLiabilities = asArray<Liability>(liabilities);
  const safeInvestmentGoals = asArray<{ name: string; target: number; current: number; timeline: string }>(investmentGoals);
  const safeIncomeStreams = asArray<{ source: string; amount: number; percentage: number }>(incomeStreams);
  const safeRecentActivity = asArray<Activity>(recentActivity);
  const safeExpenseCategories = asArray<{ category: string; amount: number; percentage: number }>(portfolioData.expenseCategories);
  const hasUserData =
    safeMonthlyData.length > 0 ||
    safeAssetAllocation.length > 0 ||
    safeIncomeStreams.length > 0 ||
    safeExpenseCategories.length > 0 ||
    safeInvestmentGoals.length > 0 ||
    safeLiabilities.length > 0;

  const totalIncome = safeIncomeStreams.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalExpenses = safeExpenseCategories.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const monthlyNet = totalIncome - totalExpenses;
  const totalDebt = safeLiabilities.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalGoalTarget = safeInvestmentGoals.reduce((sum, item) => sum + (Number(item.target) || 0), 0);
  const totalGoalCurrent = safeInvestmentGoals.reduce((sum, item) => sum + (Number(item.current) || 0), 0);
  const goalCompletion = totalGoalTarget > 0 ? Math.min(100, Math.round((totalGoalCurrent / totalGoalTarget) * 100)) : Number(portfolio.goalProgress || 0);
  const portfolioValue = Number(portfolio.totalValue || safeAssetAllocation.reduce((sum, item) => sum + (Number(item.amount) || 0), 0));
  const monthlyReturnValue = Number(portfolio.monthlyReturns || Math.max(0, monthlyNet));
  const monthlyChangeValue = Number(portfolio.monthlyChange || (totalIncome > 0 ? (monthlyNet / totalIncome) * 100 : 0));
  const returnsChangeValue = Number(portfolio.returnsChange || (portfolioValue > 0 ? (monthlyReturnValue / portfolioValue) * 100 : 0));
  const riskScore = Number(portfolio.riskScore || Math.max(0, Math.min(100, Math.round(100 - ((safeLiabilities.length * 10) + (totalDebt > 0 ? 15 : 0) + (safeAssetAllocation.length > 0 ? 5 : 25))))));

  // Format currency helper - Updated for INR
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Handle Rebalance action
  const handleRebalance = () => {
    setRebalanceMessage('Portfolio rebalanced successfully! Your allocation has been adjusted to match your target distribution.');
    setTimeout(() => {
      setIsRebalanceModalOpen(false);
      setRebalanceMessage('');
    }, 3000);
  };

  const resetToSample = async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch(`${SERVER_URL}/portfolio/reset-to-sample`, { method: 'POST' });
      if (!res.ok) throw new Error('Reset failed');
      toast.success('Portfolio reset to sample data');
      await fetchPortfolioData();
    } catch (err) {
      console.error('Reset failed', err);
      toast.error('Failed to reset to sample');
    } finally {
      setLoading(false);
      setShowResetConfirm(false);
    }
  };

  // Animation variants
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  const scaleIn = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: { duration: 0.5 }
  };

  // Number animation for portfolio value
  const CountingNumber = ({ value }: { value: number }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
      const duration = 1000;
      const steps = 60;
      const stepValue = value / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += stepValue;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(current);
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }, [value]);

    return formatCurrency(displayValue);
  };

  // Add riskScore calculation based on other metrics
  const riskMetricsWithScore: RiskMetricsWithScore = {
    volatility: Math.max(4, Math.min(25, 10 + safeLiabilities.length * 2 + safeAssetAllocation.length)),
    sharpeRatio: Number((1.2 + (goalCompletion / 100) * 1.3).toFixed(2)),
    maxDrawdown: Number((-8 - safeLiabilities.length * 1.5).toFixed(2)),
    beta: Number((0.8 + safeAssetAllocation.length * 0.05).toFixed(2)),
    alpha: Number((goalCompletion / 20).toFixed(2)),
    riskScore
  };

  const performanceData = (safeMonthlyData.length > 0
    ? safeMonthlyData.map((item, index) => ({
        month: item.name || `M${index + 1}`,
        portfolio: Number(item.value) || 0,
        benchmark: Math.max(0, Number(item.value) || 0) * 0.92,
        expenses: Number(item.expenses) || 0,
        savings: Number(item.savings) || 0,
      }))
    : [
        { month: 'Jan', portfolio: 4000, benchmark: 3680, expenses: 2800, savings: 1200 },
        { month: 'Feb', portfolio: 3000, benchmark: 2760, expenses: 2600, savings: 400 },
        { month: 'Mar', portfolio: 5000, benchmark: 4600, expenses: 2900, savings: 2101 },
        { month: 'Apr', portfolio: 2780, benchmark: 2557, expenses: 2500, savings: 280 },
        { month: 'May', portfolio: 1890, benchmark: 1739, expenses: 2400, savings: -510 },
        { month: 'Jun', portfolio: 2390, benchmark: 2198, expenses: 2200, savings: 190 },
      ]);

  return (
    <motion.div 
      className="p-6 space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {!hasUserData && (
        <motion.div
          className="rounded-2xl border border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 p-6"
          {...fadeInUp}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Complete your portfolio profile</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Add income, expenses, goals, liabilities, and asset allocation in My Data to make this dashboard fully personalized.
              </p>
            </div>
            <button
              onClick={() => navigate('/portfolio/my-data')}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-white font-medium hover:bg-indigo-700 transition-colors"
            >
              Go to My Data
            </button>
          </div>
        </motion.div>
      )}

      {/* Snapshot */}
      <motion.div 
        className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm"
        {...fadeInUp}
      >
        <div className="flex items-center justify-between space-x-4 overflow-x-auto">
          {[
            { name: 'Income', value: formatCurrency(totalIncome), trend: totalIncome >= 0 ? 'up' as const : 'down' as const },
            { name: 'Expenses', value: formatCurrency(totalExpenses), trend: 'down' as const },
            { name: 'Net Cash Flow', value: formatCurrency(monthlyNet), trend: monthlyNet >= 0 ? 'up' as const : 'down' as const },
            { name: 'Debt', value: formatCurrency(totalDebt), trend: 'down' as const }
          ].map((indicator) => (
            <div key={indicator.name} className="flex items-center space-x-2 min-w-fit">
              <span className="text-sm text-gray-600 dark:text-gray-400">{indicator.name}</span>
              <span className={`text-sm font-medium ${indicator.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                {indicator.value}
              </span>
            </div>
          ))}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowResetConfirm(true)}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-md bg-red-50 text-red-600 px-3 py-1 text-sm hover:bg-red-100 disabled:opacity-50"
            >
              Reset to sample
            </button>
          </div>
        </div>
      </motion.div>

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-11/12 max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Confirm reset</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">This will replace your current portfolio with the sample demo data. You can edit it afterwards. Proceed?</p>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={resetToSample}
                disabled={loading}
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                Yes, reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Portfolio Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Total Portfolio Value Card */}
        <motion.div 
          className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm"
          {...scaleIn}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">My Wealth</h2>
            <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-lg">
              <Wallet className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="mb-6">
            <motion.h1 
              className="text-5xl font-bold text-gray-900 dark:text-white mb-4"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, type: "spring" }}
            >
              <CountingNumber value={portfolioValue} />
            </motion.h1>
            <div className="flex items-center">
              <ArrowUpRight className="h-6 w-6 text-green-500" />
              <span className="text-green-500 text-xl font-semibold ml-1">+{monthlyChangeValue.toFixed(1)}%</span>
              <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">vs last month</span>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Daily Change</p>
              <div className="flex items-center mt-1">
                <ArrowUpRight className="h-4 w-4 text-green-500" />
                <span className="text-lg font-semibold text-gray-900 dark:text-white ml-1">
                  {formatCurrency(monthlyNet)}
                </span>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">YTD Return</p>
              <div className="flex items-center mt-1">
                <ArrowUpRight className="h-4 w-4 text-green-500" />
                <span className="text-lg font-semibold text-gray-900 dark:text-white ml-1">
                  +{returnsChangeValue.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Portfolio Health */}
          <div className="border-t dark:border-gray-700 pt-6">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Portfolio Health</h3>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-indigo-500 mr-2" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Diversification Score</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">92/100</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: '92%' }}></div>
            </div>
          </div>
        </motion.div>

        {/* Asset Allocation Chart */}
        <motion.div 
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm"
          {...scaleIn}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Asset Allocation</h3>
            <button 
              onClick={() => setIsRebalanceModalOpen(true)}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium hover:underline transition-colors"
            >
              Rebalance
            </button>
          </div>

          <div className="flex">
            {/* Pie Chart - Make it larger and more prominent */}
            <div className="flex-1 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={safeAssetAllocation.map(asset => ({
                      ...asset,
                      // Update asset names to reflect Indian market terminology
                      name: asset.name
                        .replace('US Stocks', 'Indian Stocks')
                        .replace('International Stocks', 'International Markets')
                        .replace('US Bonds', 'Indian Bonds')
                        .replace('Real Estate', 'Real Estate (India)')
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="#fff"
                    strokeWidth={2}
                    animationBegin={0}
                    animationDuration={1500}
                  >
                    {safeAssetAllocation.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, 'Allocation']}
                    contentStyle={{ borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Asset Information - More compact layout */}
            <div className="w-48 ml-4 flex flex-col justify-center">
              {safeAssetAllocation.map((asset, index) => (
                <div key={`${asset.name}-${index}`} className="mb-3 last:mb-0">
                  {quickEditMode && assetEditIndex === index ? (
                    <div className="space-y-2">
                      <input value={tempEditedAsset?.name || ''} onChange={(e) => setTempEditedAsset(temp => temp ? { ...temp, name: e.target.value } : { name: e.target.value, value: 0, amount: 0, color: '#4F46E5' })} className="w-full rounded p-1 border" />
                      <div className="flex items-center gap-2">
                        <input type="number" value={tempEditedAsset?.value ?? 0} onChange={(e) => setTempEditedAsset(temp => temp ? { ...temp, value: Number(e.target.value) } : null)} className="w-1/2 rounded p-1 border" />
                        <input type="number" value={tempEditedAsset?.amount ?? 0} onChange={(e) => setTempEditedAsset(temp => temp ? { ...temp, amount: Number(e.target.value) } : null)} className="w-1/2 rounded p-1 border" />
                      </div>
                      <div className="flex items-center justify-between">
                        <input value={tempEditedAsset?.color || '#4F46E5'} onChange={(e) => setTempEditedAsset(temp => temp ? { ...temp, color: e.target.value } : { name: '', value: 0, amount: 0, color: e.target.value })} className="rounded p-1 border w-2/3" />
                        <div className="flex items-center gap-2">
                          <button onClick={() => saveAssetInline(index)} className="text-green-600">Save</button>
                          <button onClick={cancelEditAsset} className="text-red-500">Cancel</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div 
                            className="w-2 h-2 rounded-full mr-2" 
                            style={{ backgroundColor: asset.color }}
                          />
                          <span className="text-xs font-medium text-gray-900 dark:text-white">
                            {asset.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900 dark:text-white">{asset.value}%</span>
                          {quickEditMode && (
                            <button onClick={() => startEditAsset(index)} className="text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 ml-4">{formatCurrency(asset.amount)}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Target vs Actual - More compact */}
          <div className="border-t dark:border-gray-700 mt-4 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-900 dark:text-white">Target vs Actual</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">2% variance</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400 w-16">Stocks</span>
                <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-2">
                  <div className="h-1.5 bg-indigo-500 rounded-full" style={{ width: '45%' }}></div>
                </div>
                <span className="text-xs font-medium text-gray-900 dark:text-white w-8">45%</span>
              </div>
              <div className="flex items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400 w-16">Bonds</span>
                <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-2">
                  <div className="h-1.5 bg-green-500 rounded-full" style={{ width: '25%' }}></div>
                </div>
                <span className="text-xs font-medium text-gray-900 dark:text-white w-8">25%</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Secondary Metrics */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.2
            }
          }
        }}
        initial="hidden"
        animate="show"
      >
        {/* Monthly Returns */}
        <motion.div 
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm"
          variants={{
            hidden: { opacity: 0, x: -20 },
            show: { opacity: 1, x: 0 }
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Returns</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(portfolio.monthlyReturns)}
              </h3>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <ArrowUpRight className="h-4 w-4 text-green-500" />
            <span className="text-green-500 text-sm ml-1">+{portfolio.returnsChange}%</span>
            <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">vs last month</span>
          </div>
        </motion.div>

        {/* Risk Score */}
        <motion.div 
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm"
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Risk Score</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {riskMetricsWithScore.riskScore}/100
              </h3>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900/20 p-3 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-4">
            <div 
              className="bg-yellow-500 h-2.5 rounded-full" 
              style={{ width: `${riskMetricsWithScore.riskScore}%` }}
            ></div>
          </div>
        </motion.div>

        {/* Goal Progress */}
        <motion.div 
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm"
          variants={{
            hidden: { opacity: 0, x: 20 },
            show: { opacity: 1, x: 0 }
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Goal Progress</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {goalCompletion}%
              </h3>
            </div>
            <div className="bg-indigo-100 dark:bg-indigo-900/20 p-3 rounded-lg">
              <Target className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-4">
            <div 
              className="bg-indigo-600 h-2.5 rounded-full" 
              style={{ width: `${goalCompletion}%` }}
            ></div>
          </div>
        </motion.div>
      </motion.div>

      {/* Investment Goals Progress */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Investment Goals</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {safeInvestmentGoals.map((goal, idx) => {
              const progress = (goal.current / (goal.target || 1)) * 100;
              return (
                <div key={`${goal.name}-${idx}`} className="space-y-2">
                  <div className="flex justify-between items-center">
                    {quickEditMode && goalEditIndex === idx ? (
                      <div className="flex-1">
                        <input value={tempEditedGoal?.name || ''} onChange={(e) => setTempEditedGoal(t => t ? { ...t, name: e.target.value } : null)} className="w-full rounded p-1 border" />
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{goal.name}</span>
                    )}
                    <div className="flex items-center gap-2">
                      {quickEditMode && goalEditIndex === idx ? (
                        <div className="flex items-center gap-2">
                          <button onClick={cancelEditGoal} className="text-sm text-red-500">Cancel</button>
                          <button onClick={() => saveGoalInline(idx)} className="text-sm text-green-600">Save</button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{goal.timeline}</span>
                          {quickEditMode && (
                            <button onClick={() => startEditGoal(idx)} className="text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {quickEditMode && goalEditIndex === idx ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <input type="number" value={tempEditedGoal?.current ?? 0} onChange={(e) => setTempEditedGoal(t => t ? { ...t, current: Number(e.target.value) } : null)} className="rounded p-1 border" />
                        <input type="number" value={tempEditedGoal?.target ?? 0} onChange={(e) => setTempEditedGoal(t => t ? { ...t, target: Number(e.target.value) } : null)} className="rounded p-1 border" />
                        <input value={tempEditedGoal?.timeline || ''} onChange={(e) => setTempEditedGoal(t => t ? { ...t, timeline: e.target.value } : null)} className="rounded p-1 border" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div
                          className="bg-indigo-600 h-2.5 rounded-full"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">{formatCurrency(goal.current)}</span>
                        <span className="text-gray-900 dark:text-white">{formatCurrency(goal.target)}</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Charts Grid */}
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        {/* Portfolio Performance Chart */}
        <motion.div 
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Portfolio Performance</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="portfolio" 
                  name="Your Portfolio"
                  stroke="#4F46E5" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="benchmark" 
                  name="NIFTY 50" 
                  stroke="#9CA3AF" 
                  strokeWidth={2} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Income vs Expenses */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Income vs Expenses</h3>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Income Streams</h4>
              <div className="space-y-2 mt-2">
                {safeIncomeStreams.slice(0,6).map((inc, idx) => (
                  <div key={`${inc.source}-${idx}`} className="flex items-center justify-between">
                    {quickEditMode && incomeEditIndex === idx ? (
                      <div className="flex-1 space-y-2">
                        <input value={tempEditedIncome?.source || ''} onChange={(e) => setTempEditedIncome(t => t ? { ...t, source: e.target.value } : null)} className="w-full rounded p-1 border" />
                        <div className="flex gap-2 mt-1">
                          <input type="number" value={tempEditedIncome?.amount ?? 0} onChange={(e) => setTempEditedIncome(t => t ? { ...t, amount: Number(e.target.value) } : null)} className="rounded p-1 border w-1/2" />
                          <input type="number" value={tempEditedIncome?.percentage ?? 0} onChange={(e) => setTempEditedIncome(t => t ? { ...t, percentage: Number(e.target.value) } : null)} className="rounded p-1 border w-1/2" />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={cancelEditIncome} className="text-sm text-red-500">Cancel</button>
                          <button onClick={() => saveIncomeInline(idx)} className="text-sm text-green-600">Save</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{inc.source}</div>
                          <div className="text-xs text-gray-500">{formatCurrency(Number(inc.amount))} • {inc.percentage}%</div>
                        </div>
                        {quickEditMode && (
                          <button onClick={() => startEditIncome(idx)} className="text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Expense Categories</h4>
              <div className="space-y-2 mt-2">
                {safeExpenseCategories.slice(0,6).map((ex, idx) => (
                  <div key={`${ex.category}-${idx}`} className="flex items-center justify-between">
                    {quickEditMode && expenseEditIndex === idx ? (
                      <div className="flex-1 space-y-2">
                        <input value={tempEditedExpense?.category || ''} onChange={(e) => setTempEditedExpense(t => t ? { ...t, category: e.target.value } : null)} className="w-full rounded p-1 border" />
                        <div className="flex gap-2 mt-1">
                          <input type="number" value={tempEditedExpense?.amount ?? 0} onChange={(e) => setTempEditedExpense(t => t ? { ...t, amount: Number(e.target.value) } : null)} className="rounded p-1 border w-1/2" />
                          <input type="number" value={tempEditedExpense?.percentage ?? 0} onChange={(e) => setTempEditedExpense(t => t ? { ...t, percentage: Number(e.target.value) } : null)} className="rounded p-1 border w-1/2" />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={cancelEditExpense} className="text-sm text-red-500">Cancel</button>
                          <button onClick={() => saveExpenseInline(idx)} className="text-sm text-green-600">Save</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{ex.category}</div>
                          <div className="text-xs text-gray-500">{formatCurrency(Number(ex.amount))} • {ex.percentage}%</div>
                        </div>
                        {quickEditMode && (
                          <button onClick={() => startEditExpense(idx)} className="text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={safeMonthlyData.length > 0 ? safeMonthlyData : [{ name: 'No Data', value: 0, expenses: 0, savings: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" name="Income" fill="#4F46E5" />
                <Bar dataKey="expenses" name="Expenses" fill="#EF4444" />
                <Bar dataKey="savings" name="Savings" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Metrics Radar */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Risk Analysis</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Portfolio risk metrics and analysis</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-sm font-medium">
                Risk Score: {riskMetricsWithScore.riskScore}/100
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                  { subject: 'Volatility', A: riskMetricsWithScore.volatility, fullMark: 20 },
                  { subject: 'Sharpe Ratio', A: riskMetricsWithScore.sharpeRatio, fullMark: 3 },
                  { subject: 'Alpha', A: riskMetricsWithScore.alpha, fullMark: 5 },
                  { subject: 'Beta', A: riskMetricsWithScore.beta, fullMark: 1.5 },
                  { subject: 'Max Drawdown', A: Math.abs(riskMetricsWithScore.maxDrawdown), fullMark: 20 }
                ]}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <PolarRadiusAxis stroke="#e5e7eb" />
                  <Radar 
                    name="Risk Metrics" 
                    dataKey="A" 
                    stroke="#4F46E5" 
                    fill="#4F46E5" 
                    fillOpacity={0.2} 
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Volatility', value: riskMetricsWithScore.volatility.toFixed(2), desc: 'Price variation over time', color: 'blue' },
                { label: 'Sharpe Ratio', value: riskMetricsWithScore.sharpeRatio.toFixed(2), desc: 'Risk-adjusted return', color: 'green' },
                { label: 'Alpha', value: riskMetricsWithScore.alpha.toFixed(2), desc: 'Excess return vs benchmark', color: 'indigo' },
                { label: 'Beta', value: riskMetricsWithScore.beta.toFixed(2), desc: 'Market sensitivity', color: 'purple' },
                { label: 'Max Drawdown', value: `${riskMetricsWithScore.maxDrawdown.toFixed(2)}%`, desc: 'Largest peak-to-trough decline', color: 'red' }
              ].map((metric) => (
                <div key={metric.label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{metric.label}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{metric.desc}</p>
                    </div>
                    <span className={`text-${metric.color}-600 dark:text-${metric.color}-400 font-semibold`}>
                      {metric.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Liabilities Overview */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Liabilities Overview</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track and manage your debts</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm">
                Total Debt: {formatCurrency(safeLiabilities.reduce((acc, l) => acc + l.amount, 0))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {safeLiabilities.map((liability, index) => {
              const progress = (liability.paid / (liability.amount || 1)) * 100;
              return (
                <div key={`${liability.type}-${index}`} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      {quickEditMode && liabilityEditIndex === index ? (
                        <div className="space-y-2">
                          <input value={tempEditedLiability?.type || ''} onChange={(e) => setTempEditedLiability(t => t ? { ...t, type: e.target.value } : null)} className="w-full rounded p-1 border" />
                          <input value={tempEditedLiability?.description || ''} onChange={(e) => setTempEditedLiability(t => t ? { ...t, description: e.target.value } : null)} className="w-full rounded p-1 border" />
                        </div>
                      ) : (
                        <>
                          <h4 className="font-medium text-gray-900 dark:text-white flex items-center">
                            {liability.type}
                            {liability.isSecured && (
                              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                                Secured
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{liability.description}</p>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">{liability.interestRate}% APR</span>
                      {quickEditMode && liabilityEditIndex !== index && (
                        <button onClick={() => startEditLiability(index)} className="text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {quickEditMode && liabilityEditIndex === index ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input type="number" value={tempEditedLiability?.amount ?? 0} onChange={(e) => setTempEditedLiability(t => t ? { ...t, amount: Number(e.target.value) } : null)} className="rounded p-1 border w-1/2" />
                          <input type="number" value={tempEditedLiability?.monthlyPayment ?? 0} onChange={(e) => setTempEditedLiability(t => t ? { ...t, monthlyPayment: Number(e.target.value) } : null)} className="rounded p-1 border w-1/2" />
                        </div>
                        <div className="flex gap-2">
                          <input type="number" value={tempEditedLiability?.interestRate ?? 0} onChange={(e) => setTempEditedLiability(t => t ? { ...t, interestRate: Number(e.target.value) } : null)} className="rounded p-1 border w-1/3" />
                          <input type="number" value={tempEditedLiability?.paid ?? 0} onChange={(e) => setTempEditedLiability(t => t ? { ...t, paid: Number(e.target.value) } : null)} className="rounded p-1 border w-1/3" />
                          <label className="flex items-center gap-2"><input type="checkbox" checked={tempEditedLiability?.isSecured ?? false} onChange={(e) => setTempEditedLiability(t => t ? { ...t, isSecured: e.target.checked } : null)} /> Secured</label>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button onClick={cancelEditLiability} className="text-sm text-red-500">Cancel</button>
                          <button onClick={() => saveLiabilityInline(index)} className="text-sm text-green-600">Save</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Progress</span>
                          <span className="text-gray-900 dark:text-white font-medium">{progress.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <div className="text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Monthly: </span>
                            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(liability.monthlyPayment)}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Remaining: </span>
                            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(liability.amount - liability.paid)}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Recent Activity Section */}
      <motion.div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track your latest financial movements</p>
            </div>
            <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {safeRecentActivity.length > 0 ? safeRecentActivity.map((activity, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${
                    activity.amount.startsWith('+') 
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' 
                      : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                  }`}>
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.type}</p>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        activity.status === 'Completed' 
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                          : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {activity.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{activity.date}</p>
                      {activity.category && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">•</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{activity.category}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${
                    activity.amount.startsWith('+') 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {activity.amount}
                  </p>
                  {activity.balance && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Balance: {activity.balance}
                    </p>
                  )}
                </div>
              </div>
            )) : (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                No activity yet. Add data in My Data to start tracking your portfolio.
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <div className="flex justify-end mt-4 items-center space-x-3">
        <button
          onClick={openEditModal}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:from-indigo-700 hover:to-violet-700 hover:shadow-lg hover:shadow-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <Edit2 className="h-4 w-4" />
          Edit Portfolio
        </button>
      </div>

      {/* Rebalance Modal */}
      {isRebalanceModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Rebalance Portfolio</h3>
              <button
                onClick={() => setIsRebalanceModalOpen(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {rebalanceMessage ? (
              <div className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-green-800 dark:text-green-300 text-sm">{rebalanceMessage}</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Would you like to rebalance your portfolio to match your target allocation?
                  </p>
                  
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Allocation</p>
                      {safeAssetAllocation.slice(0, 3).map((asset) => (
                        <div key={asset.name} className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                          <span>{asset.name}</span>
                          <span className="font-medium">{asset.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setIsRebalanceModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRebalance}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 font-medium transition-all transform hover:scale-102"
                  >
                    Rebalance Now
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Edit Portfolio Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-6xl w-full p-6 overflow-auto max-h-[90vh]"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Portfolio Data</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Update your numbers and save them to your account.</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4">
                {[
                  ['totalValue', 'Total Value'],
                  ['monthlyReturns', 'Monthly Returns'],
                  ['riskScore', 'Risk Score'],
                  ['goalProgress', 'Goal Progress'],
                  ['monthlyChange', 'Monthly Change %'],
                  ['returnsChange', 'Returns Change %']
                ].map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
                    <input
                      type="number"
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white"
                      value={editPortfolioSummary[key as keyof typeof editPortfolioSummary]}
                      onChange={(e) => setEditPortfolioSummary({
                        ...editPortfolioSummary,
                        [key]: Number(e.target.value)
                      })}
                    />
                  </label>
                ))}
              </section>

              <section className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Monthly Data</h4>
                  <button onClick={() => setEditMonthlyData([...editMonthlyData, { name: '', value: 0, expenses: 0, savings: 0 }])} className="text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <Plus className="h-4 w-4" /> Add row
                  </button>
                </div>
                {editMonthlyData.map((row, index) => (
                  <div key={index} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                    <input className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white" placeholder="Month" value={row.name} onChange={(e) => setEditMonthlyData(editMonthlyData.map((item, itemIndex) => itemIndex === index ? { ...item, name: e.target.value } : item))} />
                    <input type="number" className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white" placeholder="Value" value={row.value} onChange={(e) => setEditMonthlyData(editMonthlyData.map((item, itemIndex) => itemIndex === index ? { ...item, value: Number(e.target.value) } : item))} />
                    <input type="number" className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white" placeholder="Expenses" value={row.expenses} onChange={(e) => setEditMonthlyData(editMonthlyData.map((item, itemIndex) => itemIndex === index ? { ...item, expenses: Number(e.target.value) } : item))} />
                    <input type="number" className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white" placeholder="Savings" value={row.savings} onChange={(e) => setEditMonthlyData(editMonthlyData.map((item, itemIndex) => itemIndex === index ? { ...item, savings: Number(e.target.value) } : item))} />
                    <button onClick={() => setEditMonthlyData(editMonthlyData.filter((_, itemIndex) => itemIndex !== index))} className="text-red-500 flex items-center gap-1 justify-center">
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  </div>
                ))}
              </section>

              <section className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Asset Allocation</h4>
                  <button onClick={() => setEditAssetAllocation([...editAssetAllocation, { name: '', value: 0, amount: 0, color: '#4F46E5' }])} className="text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <Plus className="h-4 w-4" /> Add row
                  </button>
                </div>
                {editAssetAllocation.map((row, index) => (
                  <div key={index} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                    <input className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white" placeholder="Asset" value={row.name} onChange={(e) => setEditAssetAllocation(editAssetAllocation.map((item, itemIndex) => itemIndex === index ? { ...item, name: e.target.value } : item))} />
                    <input type="number" className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white" placeholder="Percent" value={row.value} onChange={(e) => setEditAssetAllocation(editAssetAllocation.map((item, itemIndex) => itemIndex === index ? { ...item, value: Number(e.target.value) } : item))} />
                    <input type="number" className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white" placeholder="Amount" value={row.amount} onChange={(e) => setEditAssetAllocation(editAssetAllocation.map((item, itemIndex) => itemIndex === index ? { ...item, amount: Number(e.target.value) } : item))} />
                    <input type="text" className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white" placeholder="#4F46E5" value={row.color} onChange={(e) => setEditAssetAllocation(editAssetAllocation.map((item, itemIndex) => itemIndex === index ? { ...item, color: e.target.value } : item))} />
                    <button onClick={() => setEditAssetAllocation(editAssetAllocation.filter((_, itemIndex) => itemIndex !== index))} className="text-red-500 flex items-center gap-1 justify-center">
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  </div>
                ))}
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 dark:text-white">Income Streams</h4>
                    <button onClick={() => setEditIncomeStreams([...editIncomeStreams, { source: '', amount: 0, percentage: 0 }])} className="text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <Plus className="h-4 w-4" /> Add row
                    </button>
                  </div>
                  {editIncomeStreams.map((row, index) => (
                    <div key={index} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                      <input className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white" placeholder="Source" value={row.source} onChange={(e) => setEditIncomeStreams(editIncomeStreams.map((item, itemIndex) => itemIndex === index ? { ...item, source: e.target.value } : item))} />
                      <input type="number" className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white" placeholder="Amount" value={row.amount} onChange={(e) => setEditIncomeStreams(editIncomeStreams.map((item, itemIndex) => itemIndex === index ? { ...item, amount: Number(e.target.value) } : item))} />
                      <input type="number" className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white" placeholder="%" value={row.percentage} onChange={(e) => setEditIncomeStreams(editIncomeStreams.map((item, itemIndex) => itemIndex === index ? { ...item, percentage: Number(e.target.value) } : item))} />
                      <button onClick={() => setEditIncomeStreams(editIncomeStreams.filter((_, itemIndex) => itemIndex !== index))} className="text-red-500 flex items-center gap-1 justify-center">
                        <Trash2 className="h-4 w-4" /> Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 dark:text-white">Expense Categories</h4>
                    <button onClick={() => setEditExpenseCategories([...editExpenseCategories, { category: '', amount: 0, percentage: 0 }])} className="text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <Plus className="h-4 w-4" /> Add row
                    </button>
                  </div>
                  {editExpenseCategories.map((row, index) => (
                    <div key={index} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                      <input className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white" placeholder="Category" value={row.category} onChange={(e) => setEditExpenseCategories(editExpenseCategories.map((item, itemIndex) => itemIndex === index ? { ...item, category: e.target.value } : item))} />
                      <input type="number" className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white" placeholder="Amount" value={row.amount} onChange={(e) => setEditExpenseCategories(editExpenseCategories.map((item, itemIndex) => itemIndex === index ? { ...item, amount: Number(e.target.value) } : item))} />
                      <input type="number" className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white" placeholder="%" value={row.percentage} onChange={(e) => setEditExpenseCategories(editExpenseCategories.map((item, itemIndex) => itemIndex === index ? { ...item, percentage: Number(e.target.value) } : item))} />
                      <button onClick={() => setEditExpenseCategories(editExpenseCategories.filter((_, itemIndex) => itemIndex !== index))} className="text-red-500 flex items-center gap-1 justify-center">
                        <Trash2 className="h-4 w-4" /> Remove
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 dark:text-white">Investment Goals</h4>
                    <button onClick={() => setEditGoals([...editGoals, { name: '', target: 0, current: 0, timeline: '' }])} className="text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <Plus className="h-4 w-4" /> Add row
                    </button>
                  </div>
                  {editGoals.map((row, index) => (
                    <div key={index} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                      <input className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white" placeholder="Goal" value={row.name} onChange={(e) => setEditGoals(editGoals.map((item, itemIndex) => itemIndex === index ? { ...item, name: e.target.value } : item))} />
                      <input type="number" className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white" placeholder="Target" value={row.target} onChange={(e) => setEditGoals(editGoals.map((item, itemIndex) => itemIndex === index ? { ...item, target: Number(e.target.value) } : item))} />
                      <input type="number" className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white" placeholder="Current" value={row.current} onChange={(e) => setEditGoals(editGoals.map((item, itemIndex) => itemIndex === index ? { ...item, current: Number(e.target.value) } : item))} />
                      <input className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white" placeholder="Timeline" value={row.timeline} onChange={(e) => setEditGoals(editGoals.map((item, itemIndex) => itemIndex === index ? { ...item, timeline: e.target.value } : item))} />
                      <button onClick={() => setEditGoals(editGoals.filter((_, itemIndex) => itemIndex !== index))} className="text-red-500 flex items-center gap-1 justify-center">
                        <Trash2 className="h-4 w-4" /> Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 dark:text-white">Liabilities</h4>
                    <button onClick={() => setEditLiabilities([...editLiabilities, { type: '', amount: 0, monthlyPayment: 0, interestRate: 0, paid: 0, isSecured: false, description: '' }])} className="text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <Plus className="h-4 w-4" /> Add row
                    </button>
                  </div>
                  {editLiabilities.map((row, index) => (
                    <div key={index} className="grid grid-cols-2 md:grid-cols-3 gap-3 items-end border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <input className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white" placeholder="Type" value={row.type} onChange={(e) => setEditLiabilities(editLiabilities.map((item, itemIndex) => itemIndex === index ? { ...item, type: e.target.value } : item))} />
                      <input type="number" className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white" placeholder="Amount" value={row.amount} onChange={(e) => setEditLiabilities(editLiabilities.map((item, itemIndex) => itemIndex === index ? { ...item, amount: Number(e.target.value) } : item))} />
                      <input type="number" className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white" placeholder="Monthly Payment" value={row.monthlyPayment} onChange={(e) => setEditLiabilities(editLiabilities.map((item, itemIndex) => itemIndex === index ? { ...item, monthlyPayment: Number(e.target.value) } : item))} />
                      <input type="number" className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white" placeholder="Interest Rate" value={row.interestRate} onChange={(e) => setEditLiabilities(editLiabilities.map((item, itemIndex) => itemIndex === index ? { ...item, interestRate: Number(e.target.value) } : item))} />
                      <input type="number" className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white" placeholder="Paid" value={row.paid} onChange={(e) => setEditLiabilities(editLiabilities.map((item, itemIndex) => itemIndex === index ? { ...item, paid: Number(e.target.value) } : item))} />
                      <input className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white" placeholder="Description" value={row.description} onChange={(e) => setEditLiabilities(editLiabilities.map((item, itemIndex) => itemIndex === index ? { ...item, description: e.target.value } : item))} />
                      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 md:col-span-2">
                        <input type="checkbox" checked={row.isSecured} onChange={(e) => setEditLiabilities(editLiabilities.map((item, itemIndex) => itemIndex === index ? { ...item, isSecured: e.target.checked } : item))} />
                        Secured
                      </label>
                      <button onClick={() => setEditLiabilities(editLiabilities.filter((_, itemIndex) => itemIndex !== index))} className="text-red-500 flex items-center gap-1 justify-center md:col-span-1">
                        <Trash2 className="h-4 w-4" /> Remove
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="flex justify-end space-x-3 mt-4">
              <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 border rounded text-sm">Cancel</button>
              <button onClick={handleSaveAll} className="px-4 py-2 bg-indigo-600 text-white rounded text-sm">Save</button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default Portfolio;