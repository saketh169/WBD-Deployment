import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { getUserProgressData, saveUserProgress, deleteUserProgress, getUserProgressSubscriptionInfo } from '../services/misc/miscService';

const UserProgressCharts = ({ selectedPlan, metricsForPlan, progressData }) => {
  if (!selectedPlan) return null;
  const reversedData = progressData.slice().reverse();

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-t-4 border-[#28B463]">
      <h2 className="text-2xl font-bold text-[#1E6F5C] mb-6">Your Metrics & Progress</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {metricsForPlan.includes('weight') && (
          <div className="bg-linear-to-br from-[#F0F9F7] to-white rounded-lg p-6 border-l-4 border-[#28B463]">
            <h3 className="text-xl font-bold text-[#1E6F5C] mb-4">Weight Trend</h3>
            {progressData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={reversedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="createdAt" tickFormatter={(date) => new Date(date).toLocaleDateString()} />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value} kg`} />
                  <Legend />
                  <Line type="monotone" dataKey="weight" stroke="#28B463" dot={{ fill: '#28B463' }} strokeWidth={2} name="Weight (kg)" />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-gray-500 py-8">No weight data yet</p>}
          </div>
        )}

        {metricsForPlan.includes('waterIntake') && (
          <div className="bg-linear-to-br from-blue-50 to-white rounded-lg p-6 border-l-4 border-blue-500">
            <h3 className="text-xl font-bold text-[#1E6F5C] mb-4">Water Intake Progress</h3>
            {progressData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={reversedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="createdAt" tickFormatter={(date) => new Date(date).toLocaleDateString()} />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value} L`} />
                  <Legend />
                  <Bar dataKey="waterIntake" fill="#3B82F6" name="Water (L)" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-gray-500 py-8">No water intake data yet</p>}
          </div>
        )}

        {metricsForPlan.includes('calories') && (
          <div className="bg-linear-to-br from-orange-50 to-white rounded-lg p-6 border-l-4 border-orange-500">
            <h3 className="text-xl font-bold text-[#1E6F5C] mb-4">Calories Burned</h3>
            {progressData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={reversedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="createdAt" tickFormatter={(date) => new Date(date).toLocaleDateString()} />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value} kcal`} />
                  <Legend />
                  <Bar dataKey="calories" fill="#F97316" name="Calories (kcal)" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-gray-500 py-8">No calories data yet</p>}
          </div>
        )}

        {metricsForPlan.includes('steps') && (
          <div className="bg-linear-to-br from-purple-50 to-white rounded-lg p-6 border-l-4 border-purple-500">
            <h3 className="text-xl font-bold text-[#1E6F5C] mb-4">Daily Steps</h3>
            {progressData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={reversedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="createdAt" tickFormatter={(date) => new Date(date).toLocaleDateString()} />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value.toLocaleString()} steps`} />
                  <Legend />
                  <Bar dataKey="steps" fill="#A855F7" name="Steps" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-gray-500 py-8">No steps data yet</p>}
          </div>
        )}
      </div>
    </div>
  );
};

const UserProgressHistoryTable = ({
  selectedPlan, planOptions, progressData, setDeleteId, setShowDeleteModal
}) => {
  const displayData = selectedPlan ? progressData.filter(p => p.plan === selectedPlan) : progressData;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 overflow-x-auto border-t-4 border-[#28B463]">
      <h2 className="text-2xl font-bold text-[#1E6F5C] mb-4">
        {selectedPlan ? `${planOptions.find(p => p.id === selectedPlan)?.name} - Progress History` : 'Progress History'}
      </h2>
      {displayData.length > 0 ? (
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-[#E8F5E9]">
              <th className="text-left py-3 px-4 font-semibold text-[#1E6F5C]">Date</th>
              <th className="text-left py-3 px-4 font-semibold text-[#1E6F5C]">Weight (kg)</th>
              <th className="text-left py-3 px-4 font-semibold text-[#1E6F5C]">Water (L)</th>
              <th className="text-left py-3 px-4 font-semibold text-[#1E6F5C]">Calories</th>
              <th className="text-left py-3 px-4 font-semibold text-[#1E6F5C]">Steps</th>
              <th className="text-left py-3 px-4 font-semibold text-[#1E6F5C]">Goal</th>
              {!selectedPlan && <th className="text-left py-3 px-4 font-semibold text-[#1E6F5C]">Plan</th>}
              <th className="text-left py-3 px-4 font-semibold text-[#1E6F5C]">Days</th>
              <th className="text-left py-3 px-4 font-semibold text-[#1E6F5C]">Action</th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((entry) => (
              <tr key={entry._id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                <td className="py-3 px-4">{new Date(entry.createdAt).toLocaleDateString()}</td>
                <td className="py-3 px-4 font-semibold text-[#28B463]">{entry.weight || '-'}</td>
                <td className="py-3 px-4 text-blue-500 font-semibold">{entry.waterIntake || '-'}</td>
                <td className="py-3 px-4 text-orange-500">{entry.calories || '-'}</td>
                <td className="py-3 px-4 text-purple-500">{entry.steps || '-'}</td>
                <td className="py-3 px-4 text-gray-700">{entry.goal}</td>
                {!selectedPlan && <td className="py-3 px-4 text-gray-700">{entry.plan || '-'}</td>}
                <td className="py-3 px-4 font-semibold text-[#1E6F5C]">{entry.days || '-'} days</td>
                <td className="py-3 px-4">
                  <button onClick={() => { setDeleteId(entry._id); setShowDeleteModal(true); }} className="text-red-500 hover:text-red-700" title="Delete">
                    <i className="fas fa-trash" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-center text-gray-500 py-8">
          {selectedPlan ? 'No progress entries for this plan yet.' : 'No progress entries yet. Start tracking!'}
        </p>
      )}
    </div>
  );
};

const UserProgress = () => {
  const navigate = useNavigate();
  const [progressData, setProgressData] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [formData, setFormData] = useState({ weight: '', waterIntake: '', goal: '', calories: '', steps: '', days: '' });
  const [message, setMessage] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const role = 'user';

  const planOptions = useMemo(() => [
    { id: 'weight-loss', name: 'Weight Loss', description: 'Daily calorie deficit tracking', suggestedDays: 30, metrics: ['weight', 'calories', 'waterIntake', 'steps'], tier: 'free' },
    { id: 'muscle-gain', name: 'Muscle Gain', description: 'Protein intake & strength training', suggestedDays: 60, metrics: ['weight', 'calories', 'steps'], tier: 'premium' },
    { id: 'cardio', name: 'Cardio Fitness', description: 'Running, cycling & heart health', suggestedDays: 45, metrics: ['steps', 'weight', 'waterIntake'], tier: 'basic' },
    { id: 'hydration', name: 'Hydration Goal', description: 'Daily water intake tracking', suggestedDays: 21, metrics: ['waterIntake', 'weight'], tier: 'free' },
    { id: 'balanced-diet', name: 'Balanced Diet', description: 'Nutritious meal planning', suggestedDays: 90, metrics: ['weight', 'calories', 'waterIntake'], tier: 'basic' },
    { id: 'energy', name: 'Energy Boost', description: 'Sleep & nutrition optimization', suggestedDays: 30, metrics: ['weight', 'calories', 'waterIntake', 'steps'], tier: 'basic' },
    { id: 'detox', name: 'Detox Program', description: 'Clean eating & toxin removal', suggestedDays: 14, metrics: ['waterIntake', 'weight'], tier: 'premium' },
    { id: 'stamina', name: 'Stamina Building', description: 'Endurance & performance training', suggestedDays: 60, metrics: ['steps', 'weight'], tier: 'premium' },
    { id: 'maintenance', name: 'Weight Maintenance', description: 'Stable weight & health metrics', suggestedDays: 180, metrics: ['weight', 'calories', 'waterIntake', 'steps'], tier: 'premium' },
    { id: 'flexibility', name: 'Flexibility & Mobility', description: 'Yoga & stretching routine', suggestedDays: 30, metrics: ['weight'], tier: 'basic' },
    { id: 'recovery', name: 'Post-Injury Recovery', description: 'Rehabilitative exercises', suggestedDays: 45, metrics: ['weight', 'steps'], tier: 'ultimate' },
    { id: 'diabetes', name: 'Diabetes Management', description: 'Blood sugar & nutrition control', suggestedDays: 90, metrics: ['weight', 'calories'], tier: 'ultimate' },
    { id: 'stress', name: 'Stress Relief', description: 'Meditation & mental wellness', suggestedDays: 21, metrics: ['waterIntake', 'weight'], tier: 'premium' },
    { id: 'athletic', name: 'Athletic Performance', description: 'Sport-specific training', suggestedDays: 60, metrics: ['steps', 'weight', 'calories'], tier: 'ultimate' },
    { id: 'general', name: 'General Wellness', description: 'Overall health improvement', suggestedDays: 30, metrics: ['weight', 'calories', 'waterIntake', 'steps'], tier: 'free' }
  ], []);

  const isPlanAccessible = (planId) => {
    if (!subscriptionInfo?.accessiblePlans) return true;
    return subscriptionInfo.accessiblePlans.includes(planId);
  };

  const getTierBadgeColor = (tier) => {
    switch (tier) {
      case 'basic': return 'bg-blue-500';
      case 'premium': return 'bg-amber-500';
      case 'ultimate': return 'bg-purple-600';
      default: return 'bg-gray-400';
    }
  };

  const getMetricsForPlan = () => {
    const plan = planOptions.find(p => p.id === selectedPlan);
    return plan ? plan.metrics : [];
  };

  const showAlert = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(''), 4000);
  };

  const handlePlanChange = (planId) => {
    const plan = planOptions.find(p => p.id === planId);
    if (plan) {
      if (!isPlanAccessible(plan.id)) {
        showAlert(`This plan requires a ${plan.tier} subscription.`, 'error');
        return;
      }
      setSelectedPlan(plan.id);
      setFormData({ weight: '', waterIntake: '', goal: '', calories: '', steps: '', days: plan.suggestedDays.toString() });
    } else {
      setSelectedPlan('');
    }
  };

  const metricsForPlan = getMetricsForPlan();

  useEffect(() => {
    const token = localStorage.getItem(`authToken_${role}`);
    if (!token) {
      alert('Session expired. Please login again.');
      navigate(`/signin?role=${role}`);
      return;
    }

    const fetchData = async () => {
      const res = await getUserProgressData();
      if (!res.isError) {
        setProgressData(res.data || []);
        if (res.data?.length > 0) {
          const planId = res.data[0].plan;
          const plan = planOptions.find(p => p.id === planId);
          if (plan) {
            setSelectedPlan(planId);
            setFormData(prev => ({ ...prev, days: plan.suggestedDays.toString() }));
          }
        }
      }
      const subRes = await getUserProgressSubscriptionInfo();
      if (!subRes.isError && subRes.data) setSubscriptionInfo(subRes.data);
    };

    fetchData();
  }, [navigate, role, planOptions]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return showAlert('Please select a plan', 'error');
    if (!formData.goal?.trim()) return showAlert('Goal is required', 'error');

    const days = parseInt(formData.days);
    if (!days || days < 1 || days > 365) return showAlert('Days must be between 1-365', 'error');

    const submitData = {
      plan: selectedPlan,
      days,
      goal: formData.goal.trim(),
      weight: metricsForPlan.includes('weight') ? parseFloat(formData.weight) : null,
      waterIntake: metricsForPlan.includes('waterIntake') ? parseFloat(formData.waterIntake) : null,
      calories: metricsForPlan.includes('calories') ? parseFloat(formData.calories) : null,
      steps: metricsForPlan.includes('steps') ? parseInt(formData.steps) : null,
    };

    setLoading(true);
    const res = await saveUserProgress(submitData);
    if (!res.isError) {
      showAlert('Progress saved successfully!', 'success');
      setProgressData([res.data || res.entry, ...progressData]);
      setFormData({ weight: '', waterIntake: '', goal: '', calories: '', steps: '', days: formData.days });
    } else {
      showAlert(res.message || 'Error saving progress', 'error');
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    const res = await deleteUserProgress(deleteId);
    if (!res.isError) {
      setProgressData(progressData.filter(p => p._id !== deleteId));
      showAlert('Entry deleted successfully!', 'success');
    } else {
      showAlert(res.message || 'Error deleting entry', 'error');
    }
    setShowDeleteModal(false);
    setDeleteId(null);
    setLoading(false);
  };

  const activePlanData = selectedPlan ? progressData.filter(p => p.plan === selectedPlan) : progressData;

  return (
    <div className="min-h-screen bg-linear-to-br from-[#E8F5E9] via-[#F1F8E9] to-[#FFF9C4]">
      {message && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 p-4 rounded-lg shadow-lg ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
          {message.text}
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {subscriptionInfo && (
          <div className="mb-6 p-4 rounded-lg bg-white border flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase text-white ${getTierBadgeColor(subscriptionInfo.planType)}`}>{subscriptionInfo.planType || 'Free'} Plan</span>
              <span className="text-gray-700 font-medium">{subscriptionInfo.accessiblePlans?.length || 3} of {planOptions.length} wellness plans available</span>
            </div>
            {subscriptionInfo.planType !== 'ultimate' && (
              <button onClick={() => navigate('/user/pricing')} className="px-4 py-2 bg-[#1E6F5C] text-white rounded-lg text-sm font-semibold hover:bg-[#28B463]">Upgrade for More Plans</button>
            )}
          </div>
        )}

        <div className="relative mb-8 text-center">
          <button onClick={() => navigate('/user/profile')} className="absolute left-0 top-0 px-4 py-2 bg-[#1E6F5C] text-white rounded-lg font-semibold hover:bg-[#28B463]">Back to Profile</button>
          <h1 className="text-4xl font-bold text-[#1E6F5C]">Your Progress Tracker</h1>
          <p className="text-gray-600 mt-2">Monitor your daily health metrics and goals</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow"><p className="text-gray-600 text-sm font-semibold">Total Entries</p><p className="text-3xl font-bold text-[#28B463]">{activePlanData.length}</p></div>
          <div className="bg-white p-4 rounded-lg shadow"><p className="text-gray-600 text-sm font-semibold">Avg Weight</p><p className="text-3xl font-bold text-[#1E6F5C]">{activePlanData.length ? (activePlanData.reduce((s, p) => s + (p.weight || 0), 0) / activePlanData.length).toFixed(1) : 0} kg</p></div>
          <div className="bg-white p-4 rounded-lg shadow"><p className="text-gray-600 text-sm font-semibold">Total Water</p><p className="text-3xl font-bold text-blue-500">{activePlanData.reduce((s, p) => s + (p.waterIntake || 0), 0).toFixed(1)} L</p></div>
          <div className="bg-white p-4 rounded-lg shadow"><p className="text-gray-600 text-sm font-semibold">Total Calories</p><p className="text-3xl font-bold text-orange-500">{activePlanData.reduce((s, p) => s + (p.calories || 0), 0)}</p></div>
          <div className="bg-white p-4 rounded-lg shadow"><p className="text-gray-600 text-sm font-semibold">Total Steps</p><p className="text-3xl font-bold text-purple-500">{activePlanData.reduce((s, p) => s + (p.steps || 0), 0).toLocaleString()}</p></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4 border-t-4 border-[#28B463]">
              <h2 className="text-2xl font-bold text-[#1E6F5C] mb-4">Select Plan</h2>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {planOptions.map(plan => {
                  const accessible = isPlanAccessible(plan.id);
                  const selected = selectedPlan === plan.id;
                  return (
                    <div key={plan.id} onClick={() => accessible && handlePlanChange(plan.id)} className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selected ? 'border-[#28B463] bg-[#F0F9F7] shadow-md' : accessible ? 'border-gray-200 hover:border-[#28B463]' : 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold text-sm ${selected ? 'text-[#1E6F5C]' : 'text-gray-700'}`}>{plan.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getTierBadgeColor(plan.tier)} text-white`}>{plan.tier}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{plan.description}</p>
                    </div>
                  );
                })}
              </div>
              {selectedPlan && (
                <button type="button" onClick={() => setSelectedPlan('')} className="mt-4 w-full px-3 py-2 bg-gray-300 text-gray-800 text-sm rounded-lg hover:bg-gray-400 font-semibold">Clear Selection</button>
              )}
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-[#28B463]">
              <h2 className="text-2xl font-bold text-[#1E6F5C] mb-4">Add Daily Progress</h2>
              {selectedPlan ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Duration (Days) *</label>
                      <input type="number" name="days" value={formData.days} onChange={handleInputChange} min="1" max="365" required className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Goal *</label>
                      <input type="text" name="goal" value={formData.goal} onChange={handleInputChange} maxLength="100" required placeholder="e.g., Lose 5 kg" className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                  </div>
                  {metricsForPlan.includes('weight') && (
                    <div><label className="block text-sm font-semibold text-gray-700 mb-1">Weight (kg) *</label><input type="number" name="weight" value={formData.weight} onChange={handleInputChange} step="0.1" min="20" max="300" required className="w-full px-4 py-2 border rounded-lg" /></div>
                  )}
                  {metricsForPlan.includes('waterIntake') && (
                    <div><label className="block text-sm font-semibold text-gray-700 mb-1">Water Intake (L) *</label><input type="number" name="waterIntake" value={formData.waterIntake} onChange={handleInputChange} step="0.1" min="0" max="10" required className="w-full px-4 py-2 border rounded-lg" /></div>
                  )}
                  {metricsForPlan.includes('calories') && (
                    <div><label className="block text-sm font-semibold text-gray-700 mb-1">Calories (kcal) *</label><input type="number" name="calories" value={formData.calories} onChange={handleInputChange} min="0" max="5000" required className="w-full px-4 py-2 border rounded-lg" /></div>
                  )}
                  {metricsForPlan.includes('steps') && (
                    <div><label className="block text-sm font-semibold text-gray-700 mb-1">Steps (daily) *</label><input type="number" name="steps" value={formData.steps} onChange={handleInputChange} min="0" required className="w-full px-4 py-2 border rounded-lg" /></div>
                  )}
                  <button type="submit" disabled={loading} className="w-full bg-[#28B463] text-white py-3 rounded-lg font-semibold hover:bg-[#1E6F5C] transition disabled:bg-gray-400">
                    {loading ? 'Saving...' : 'Save Progress'}
                  </button>
                </form>
              ) : (
                <div className="text-center py-12 text-gray-500">Select a plan from the left to start tracking your progress</div>
              )}
            </div>
          </div>
        </div>

        <UserProgressCharts selectedPlan={selectedPlan} metricsForPlan={metricsForPlan} progressData={progressData} />
        <UserProgressHistoryTable selectedPlan={selectedPlan} planOptions={planOptions} progressData={progressData} setDeleteId={setDeleteId} setShowDeleteModal={setShowDeleteModal} />
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm shadow-xl text-center">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this progress entry?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 bg-gray-400 text-white rounded-lg">Cancel</button>
              <button onClick={handleDelete} disabled={loading} className="px-4 py-2 bg-red-500 text-white rounded-lg">{loading ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProgress;
