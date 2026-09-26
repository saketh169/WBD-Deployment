import React, { useState, useEffect, useContext } from 'react';
import { ChevronLeft, Utensils, Users, X, Plus, Save, Trash2, Loader2, Calendar, Search, Check, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDietitianClients } from '../../services/dietitian/dietitianService';
import { getDietitianClientMealPlans, createMealPlan, deleteMealPlan, assignMealPlanDates, removeMealPlanDates } from '../../services/mealplan/mealPlanService';
import AuthContext from '../../contexts/AuthContext';
import { dateToKey, CalendarView, PlanDetailModal } from './DietitianMealPlanCalendar';

const MEAL_TYPES = ['Vegan', 'Vegetarian', 'Keto', 'Mediterranean', 'High-Protein', 'Low-Carb', 'Anything'];

const DietitianAddPlanForm = () => {
    const navigate = useNavigate();
    const { user, token } = useContext(AuthContext);
    const [view, setView] = useState('CLIENT_LIST');
    const [clients, setClients] = useState([]);
    const [loadingClients, setLoadingClients] = useState(true);
    const [clientsError, setClientsError] = useState(null);
    const [selectedClient, setSelectedClient] = useState(null);
    const [availablePlans, setAvailablePlans] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [selectedDays, setSelectedDays] = useState([]);
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [assignmentMode, setAssignmentMode] = useState('single');
    const [loading, setLoading] = useState(false);
    const [deleteMode, setDeleteMode] = useState(false);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [selectedPlanForModal, setSelectedPlanForModal] = useState(null);
    const [selectedDateForModal, setSelectedDateForModal] = useState('');

    useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);

    useEffect(() => {
        if (!user?.id || !token) { setLoadingClients(false); return; }
        const fetchClients = async () => {
            try {
                setLoadingClients(true); setClientsError(null);
                const response = await getDietitianClients(user.id);
                if (response && !response.isError && response.success) {
                    setClients((response.data || []).map(c => ({ id: c.id, name: c.name, goal: c.goal || 'General Wellness (2000 kcal)', recentPlan: c.recentPlan || 'Balanced Diet' })));
                } else throw new Error(response?.message || 'Failed to fetch clients');
            } catch (err) {
                setClientsError(err.response?.data?.message || err.message || 'Failed to load clients');
                setClients([]);
            } finally { setLoadingClients(false); }
        };
        fetchClients();
    }, [user?.id, token]);

    const handleSelectClient = async (client) => {
        setSelectedClient(client); setLoading(true);
        try {
            const response = await getDietitianClientMealPlans(user.id, client.id);
            if (response && !response.isError && response.success) {
                setAvailablePlans((response.data || []).map(p => ({ ...p, id: p.id || p._id, assignedDates: p.assignedDates || [] })));
            } else throw new Error(response?.message || 'Failed to fetch meal plans');
        } catch { setAvailablePlans([]); alert('Failed to load existing meal plans for this client'); }
        finally { setLoading(false); }
        setView('CLIENT_DASHBOARD');
    };

    const handleDeletePlan = async (planId) => {
        if (!confirm('Are you sure you want to delete this meal plan?')) return;
        try {
            const response = await deleteMealPlan(planId);
            if (response && !response.isError && response.success) {
                setAvailablePlans(prev => prev.filter(p => p.id !== planId));
                alert('Plan deleted successfully!');
            } else throw new Error(response?.message || 'Failed to delete meal plan');
        } catch (err) { alert(err.response?.data?.message || err.message || 'Failed to delete meal plan'); }
    };

    const changeMonth = (delta) => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

    const handleCalendarAssignPlan = async (date, showAlert = true) => {
        if (!selectedPlan) return;
        const dateKey = dateToKey(date);
        try {
            const response = await assignMealPlanDates(selectedPlan.id, { userId: selectedClient.id, dates: [dateKey] });
            if (response && !response.isError && response.success) {
                setAvailablePlans(prev => prev.map(p => p.id === selectedPlan.id ? { ...p, assignedDates: [...(p.assignedDates || []), dateKey] } : p));
                if (showAlert) alert(`Plan "${selectedPlan.planName}" assigned to ${selectedClient.name} for ${dateKey}!`);
            } else throw new Error(response?.message || 'Failed to assign meal plan');
        } catch (err) { alert(err.response?.data?.message || err.message || 'Failed to assign meal plan'); }
    };

    const handleRemovePlan = async (dateKey, showAlert = true) => {
        if (!selectedClient) return;
        const planToRemove = availablePlans.find(p => p.assignedDates?.includes(dateKey));
        if (!planToRemove) return;
        try {
            const response = await removeMealPlanDates(planToRemove.id, { userId: selectedClient.id, dietitianId: user.id, dates: [dateKey] });
            if (response && !response.isError && response.success) {
                setAvailablePlans(prev => prev.map(p => ({ ...p, assignedDates: (p.assignedDates || []).filter(d => d !== dateKey) })));
                if (showAlert) alert(`Plan removed for ${selectedClient.name} on ${dateKey}.`);
            } else throw new Error(response?.message || 'Failed to remove meal plan');
        } catch (err) { alert(err.response?.data?.message || err.message || 'Failed to remove meal plan'); }
    };

    const handleDaySelect = (date) => {
        const key = dateToKey(date);
        setSelectedDays(prev => prev.some(d => dateToKey(d) === key) ? prev.filter(d => dateToKey(d) !== key) : [...prev, date]);
    };

    const handleViewPlan = (plan, date) => { setSelectedPlanForModal(plan); setSelectedDateForModal(date); setShowPlanModal(true); };
    const closePlanModal = () => { setShowPlanModal(false); setSelectedPlanForModal(null); setSelectedDateForModal(''); };

    const handleSavePlan = async (planFormState, mealEntries, setErrors, setMessage) => {
        if (!selectedClient) return;
        const existingPlan = availablePlans.find(p => p.planName.toLowerCase() === planFormState.planName.trim().toLowerCase());
        if (existingPlan) { setErrors(prev => ({ ...prev, planName: 'A plan with this name already exists.' })); setMessage('Please fix the validation mistakes before submitting.'); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
        setLoading(true);
        try {
            const planData = { planName: planFormState.planName.trim(), dietType: planFormState.dietType, calories: parseInt(planFormState.calories) || 0, notes: planFormState.notes, imageUrl: planFormState.imageUrl, meals: mealEntries.map(m => ({ name: m.mealName.trim(), calories: parseInt(m.calories) || 0, details: m.details })), dietitianId: user.id, userId: selectedClient.id };
            const response = await createMealPlan(planData);
            if (response && !response.isError && response.success) {
                setAvailablePlans(prev => [...prev, { ...response.data, id: response.data._id || response.data.id, assignedDates: [] }]);
                setMessage(`Meal plan "${response.data.planName}" added successfully!`);
                setTimeout(() => setView('CLIENT_DASHBOARD'), 2000);
            } else throw new Error(response?.message || 'Failed to create meal plan');
        } catch (err) {
            setErrors(prev => ({ ...prev, general: err.response?.data?.message || err.message || 'Failed to create meal plan' }));
            setMessage('Failed to create meal plan. Please try again.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally { setLoading(false); }
    };

    const removeDatesFromPlans = async (dateKeys, successMessage) => {
        if (!dateKeys?.length) return;
        try {
            const plansToUpdate = availablePlans.filter(p => p.assignedDates?.some(d => dateKeys.includes(d)));
            await Promise.all(plansToUpdate.map(p => {
                const toRemove = p.assignedDates.filter(d => dateKeys.includes(d));
                return toRemove.length ? removeMealPlanDates(p.id, { userId: selectedClient.id, dietitianId: user.id, dates: toRemove }) : Promise.resolve();
            }));
            setAvailablePlans(prev => prev.map(p => ({ ...p, assignedDates: (p.assignedDates || []).filter(d => !dateKeys.includes(d)) })));
            if (successMessage) alert(successMessage);
        } catch (err) { alert(err.response?.data?.message || err.message || 'Failed to remove meal plans'); }
    };

    const assignDatesToSelectedPlan = async (dateKeys, successMessage) => {
        if (!selectedPlan || !dateKeys?.length) return;
        try {
            const response = await assignMealPlanDates(selectedPlan.id, { userId: selectedClient.id, dates: dateKeys });
            if (response && !response.isError && response.success) {
                setAvailablePlans(prev => prev.map(p => p.id === selectedPlan.id ? { ...p, assignedDates: [...(p.assignedDates || []), ...dateKeys] } : p));
                if (successMessage) alert(successMessage);
            } else throw new Error(response?.message || 'Failed to assign meal plan');
        } catch (err) { alert(err.response?.data?.message || err.message || 'Failed to assign meal plan'); }
    };

    const getMonthDateKeys = () => {
        const year = currentDate.getFullYear(), month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        return Array.from({ length: daysInMonth }, (_, i) => dateToKey(new Date(year, month, i + 1)));
    };

    const getRangeDateKeys = (start, end) => {
        if (!start || !end) return [];
        const keys = [];
        for (let d = new Date(start); d <= new Date(end); d.setDate(d.getDate() + 1)) keys.push(dateToKey(new Date(d)));
        return keys;
    };

    const ModeButton = ({ mode, label, desc, color = 'emerald' }) => (
        <button onClick={() => setAssignmentMode(mode)} className={`p-4 rounded-xl border-2 transition-all duration-200 ${assignmentMode === mode ? `border-${color}-500 bg-${color}-50 text-${color}-700` : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}>
            <Calendar className="text-2xl mb-2 block" />
            <div className="font-semibold">{label}</div>
            <div className="text-sm">{desc}</div>
        </button>
    );

    const PageShell = ({ title, subtitle, onBack, backLabel = 'Back', children }) => (
        <div className="min-h-screen bg-linear-to-br from-slate-50 via-emerald-50 to-teal-50 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-7xl mx-auto pt-8">
                <div className="flex items-center justify-between mb-8">
                    <button onClick={onBack} className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg shadow-md hover:bg-emerald-700 font-semibold">
                        <ChevronLeft className="mr-2" />{backLabel}
                    </button>
                    <div className="text-center">
                        <h1 className="text-2xl sm:text-3xl font-bold bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">{title}</h1>
                        {subtitle && <p className="text-sm text-slate-600 mt-1">{subtitle}</p>}
                    </div>
                    <div />
                </div>
                {children}
            </div>
        </div>
    );

    const ClientList = () => (
        <div className="min-h-screen bg-linear-to-br from-slate-50 via-emerald-50 to-teal-50 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-7xl mx-auto pt-4">
                <div className="relative mb-8 px-4">
                    <button onClick={() => navigate('/dietitian/profile')} className="absolute left-0 top-0 px-4 py-2 bg-emerald-600 text-white rounded-lg shadow-md hover:bg-emerald-700 font-semibold">Back to Profile</button>
                    <div className="text-center">
                        <div className="inline-flex items-center gap-3">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-linear-to-r from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
                                <Users className="text-white" />
                            </div>
                            <h1 className="text-2xl sm:text-4xl font-bold bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">My Clients</h1>
                        </div>
                        <p className="text-sm text-slate-600 mt-2">Select a client to manage their meal plans</p>
                    </div>
                </div>
                <div className="space-y-4">
                    {loadingClients ? (
                        <div className="text-center py-12"><Loader2 className="text-4xl text-emerald-300 animate-spin mb-4 mx-auto" /><p className="text-slate-500 text-lg">Loading your clients...</p></div>
                    ) : clientsError ? (
                        <div className="text-center py-12"><p className="text-red-500 text-lg mb-4">Error loading clients</p><p className="text-slate-400 text-sm">{clientsError}</p><button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">Retry</button></div>
                    ) : clients.length === 0 ? (
                        <div className="text-center py-12"><Users className="text-4xl text-slate-300 mb-4 mx-auto" /><p className="text-slate-500 text-lg">No clients found</p><p className="text-slate-400 text-sm mt-2">Clients appear once they book consultations with you</p></div>
                    ) : clients.map(client => (
                        <div key={client.id} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4 hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 bg-emerald-100 rounded-xl"><Users className="text-emerald-600" /></div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">{client.name}</h3>
                                        <p className="text-sm text-slate-500">Active Client</p>
                                        <div className="flex items-center space-x-4 mt-1">
                                            <span className="text-xs text-slate-600"><span className="font-semibold">Goal:</span> {client.goal}</span>
                                            <span className="text-xs text-slate-600"><span className="font-semibold">Recent Plan:</span> {client.recentPlan}</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => handleSelectClient(client)} className="px-6 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition font-medium shadow-md">Assign Plans</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const ClientDashboard = () => (
        <PageShell title={`${selectedClient.name}'s Meal Plans`} subtitle={selectedClient.goal} onBack={() => setView('CLIENT_LIST')} backLabel="Back to Clients">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center"><Utensils className="mr-3 text-emerald-600" /> Available Plans ({availablePlans.length})</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setDeleteMode(!deleteMode)} className={`px-4 py-2 rounded-xl font-medium ${deleteMode ? 'bg-red-500 text-white' : 'bg-slate-500 text-white hover:bg-slate-600'}`}>{deleteMode ? 'Cancel Delete' : 'Delete Plans'}</button>
                        <button onClick={() => { setView('CREATE_PLAN'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center px-4 py-2 bg-linear-to-r from-emerald-500 to-teal-600 text-white rounded-xl shadow-lg hover:from-emerald-600 hover:to-teal-700 font-medium">
                            <Plus className="mr-2" /> Add Plan
                        </button>
                    </div>
                </div>
                {availablePlans.length === 0 ? (
                    <div className="text-center py-12"><Utensils className="text-4xl text-slate-300 mb-4 mx-auto" /><p className="text-slate-500 text-lg">No plans created yet</p></div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {availablePlans.map(plan => (
                            <div key={plan.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 hover:shadow-lg transition-all">
                                {plan.imageUrl && <div className="mb-3"><img src={plan.imageUrl} alt={plan.planName} className="w-full h-32 object-contain rounded-lg" onError={e => { e.target.style.display = 'none'; }} /></div>}
                                <div className="flex items-start justify-between mb-3">
                                    <div><h3 className="font-bold text-slate-800 text-lg">{plan.planName}</h3><p className="text-sm text-slate-500">{plan.dietType} • {plan.calories} kcal</p></div>
                                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium">{plan.dietType}</span>
                                </div>
                                {plan.notes && <p className="text-sm text-slate-600 mb-3 line-clamp-2">{plan.notes}</p>}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500">{plan.meals.length} meals</span>
                                    {deleteMode ? (
                                        <button onClick={() => handleDeletePlan(plan.id)} className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium">Delete</button>
                                    ) : (
                                        <button onClick={() => { setSelectedPlan(plan); setView('ASSIGN_PLAN'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="px-3 py-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm font-medium">Assign Plan</button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center"><Calendar className="mr-3 text-emerald-600" /> Schedule Calendar</h2>
                    <div className="flex gap-2">
                        <button onClick={() => { setSelectedPlan(null); setView('DELETE_PLAN'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center px-4 py-2 bg-red-500 text-white rounded-xl shadow-lg hover:bg-red-600 font-medium">
                            <Trash2 className="mr-2" /> Delete Plans
                        </button>
                        <div className="flex items-center gap-2">
                            <Search className="text-slate-500" />
                            <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
                            <span className="text-slate-500">to</span>
                            <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
                            {(filterStartDate || filterEndDate) && <button onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }} className="px-3 py-1 text-slate-500 hover:text-slate-700 text-sm">Clear</button>}
                        </div>
                    </div>
                </div>
                <CalendarView currentDate={currentDate} plans={availablePlans} selectedClient={selectedClient} changeMonth={changeMonth} setCurrentDate={setCurrentDate} selectedDays={selectedDays} onDaySelect={handleDaySelect} filterStartDate={filterStartDate} filterEndDate={filterEndDate} assignmentMode={null} onViewPlan={handleViewPlan} isDeleteMode={false} />
            </div>
        </PageShell>
    );

    const CreatePlanForm = () => {
        const [formState, setFormState] = useState({ planName: '', dietType: 'Vegan', calories: 1800, notes: '', imageUrl: '' });
        const [mealEntries, setMealEntries] = useState([{ mealName: '', calories: '', details: '' }]);
        const [errors, setErrors] = useState({});
        const [message, setMessage] = useState('');

        const handleFormChange = e => { const { id, value } = e.target; setFormState(p => ({ ...p, [id]: value })); if (errors[id]) setErrors(p => ({ ...p, [id]: null })); };
        const handleMealChange = (i, field, value) => { const m = [...mealEntries]; m[i][field] = value; setMealEntries(m); if (errors[`meal_${i}_${field}`]) setErrors(p => ({ ...p, [`meal_${i}_${field}`]: null })); };

        const validateForm = () => {
            const e = {};
            if (!formState.planName.trim()) e.planName = 'Plan name is required';
            const cal = parseInt(formState.calories);
            if (!cal || cal < 500 || cal > 5000) e.calories = 'Calories must be between 500 and 5000';
            mealEntries.forEach((m, i) => {
                if (!m.mealName.trim()) e[`meal_${i}_mealName`] = 'Meal name is required';
                if (!m.calories || parseInt(m.calories) < 0) e[`meal_${i}_calories`] = 'Approx. calories must be 0 or more';
            });
            if (!mealEntries.length || mealEntries.every(m => !m.mealName.trim())) e.meals = 'At least one meal is required';
            setErrors(e); return Object.keys(e).length === 0;
        };

        const handleSubmit = () => { if (!validateForm()) { window.scrollTo({ top: 0, behavior: 'smooth' }); setMessage('Please fix the validation mistakes before submitting.'); return; } setMessage('Creating meal plan...'); window.scrollTo({ top: 0, behavior: 'smooth' }); handleSavePlan(formState, mealEntries, setErrors, setMessage); };

        return (
            <div className="min-h-screen bg-linear-to-br from-slate-50 via-emerald-50 to-teal-50 pb-12 px-4 sm:px-6 lg:px-8">
                <div className="w-[75%] mx-auto pt-8">
                    <div className="relative mb-8">
                        <button onClick={() => setView('CLIENT_DASHBOARD')} className="absolute left-0 top-0 flex items-center px-4 py-2 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 font-medium"><ChevronLeft className="mr-2" /> Back</button>
                        <div className="text-center"><h1 className="text-2xl sm:text-3xl font-bold bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">Create Meal Plan</h1><p className="text-sm text-slate-600 mt-1">For {selectedClient?.name}</p></div>
                    </div>
                    {message && <div aria-live="polite" role="alert" className={`p-3 mb-5 text-center text-base font-medium rounded-lg shadow-sm w-full ${message.includes('successfully') || message.includes('Redirecting') ? 'text-green-800 bg-green-100 border border-green-300' : message.includes('Creating') ? 'text-blue-800 bg-blue-100 border border-blue-300' : 'text-red-800 bg-red-100 border border-red-300'}`}>{message}</div>}
                    <div className="space-y-6">
                        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6">
                            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><Utensils className="mr-3 text-emerald-600" /> Plan Details</h2>
                            <div className="grid md:grid-cols-3 gap-4">
                                {[{ id: 'planName', label: 'Plan Name *', type: 'text', placeholder: 'e.g., Daily High Protein' }, { id: 'calories', label: 'Daily Calories (kcal) *', type: 'number', min: 500, max: 5000 }].map(f => (
                                    <label key={f.id} className="block">
                                        <span className="text-sm font-medium text-slate-700">{f.label}</span>
                                        <input {...f} value={formState[f.id]} onChange={handleFormChange} className={`w-full mt-1 p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 ${errors[f.id] ? 'border-red-500 bg-red-50' : 'border-slate-300'}`} />
                                        {errors[f.id] && <p className="text-red-500 text-xs mt-1">{errors[f.id]}</p>}
                                    </label>
                                ))}
                                <label className="block">
                                    <span className="text-sm font-medium text-slate-700">Diet Type *</span>
                                    <select id="dietType" value={formState.dietType} onChange={handleFormChange} className="w-full mt-1 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500">
                                        {MEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </label>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4 mt-4">
                                <label className="block"><span className="text-sm font-medium text-slate-700">Plan Image URL</span><input type="url" id="imageUrl" value={formState.imageUrl} onChange={handleFormChange} className="w-full mt-1 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500" placeholder="https://example.com/image.jpg" /></label>
                                <label className="block"><span className="text-sm font-medium text-slate-700">Upload Image</span><input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = ev => setFormState(p => ({ ...p, imageUrl: ev.target.result })); r.readAsDataURL(f); } }} className="w-full mt-1 p-3 border border-slate-300 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" /></label>
                            </div>
                            <label className="block mt-4"><span className="text-sm font-medium text-slate-700">General Notes</span><textarea id="notes" value={formState.notes} onChange={handleFormChange} className="w-full mt-1 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 resize-y" rows="3" placeholder="Important notes: Drink 3L water, avoid sugars, etc." /></label>
                        </div>
                        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-slate-800 flex items-center"><Utensils className="mr-3 text-emerald-600" /> Meal Entries</h2>
                                <button onClick={() => setMealEntries(p => [...p, { mealName: '', calories: '', details: '' }])} className="flex items-center px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-medium"><Plus className="mr-2" /> Add Meal</button>
                            </div>
                            <div className="space-y-4">
                                {mealEntries.length === 0 && <p className="text-center text-slate-500 italic py-8">No meals defined yet.</p>}
                                {mealEntries.map((meal, i) => (
                                    <div key={i} className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                                        <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-emerald-600">Meal {i + 1}</h4><button onClick={() => setMealEntries(p => p.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700 p-1"><X /></button></div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <label className="block col-span-2"><span className="text-xs font-medium text-slate-700">Meal Name *</span><input type="text" value={meal.mealName} onChange={e => handleMealChange(i, 'mealName', e.target.value)} className={`w-full mt-1 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 ${errors[`meal_${i}_mealName`] ? 'border-red-500 bg-red-50' : 'border-slate-300'}`} placeholder="e.g., Chicken Salad" />{errors[`meal_${i}_mealName`] && <p className="text-red-500 text-xs mt-1">{errors[`meal_${i}_mealName`]}</p>}</label>
                                            <label className="block"><span className="text-xs font-medium text-slate-700">Approx. Calories *</span><input type="number" value={meal.calories} onChange={e => handleMealChange(i, 'calories', e.target.value)} className={`w-full mt-1 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 ${errors[`meal_${i}_calories`] ? 'border-red-500 bg-red-50' : 'border-slate-300'}`} min="0" />{errors[`meal_${i}_calories`] && <p className="text-red-500 text-xs mt-1">{errors[`meal_${i}_calories`]}</p>}</label>
                                        </div>
                                        <label className="block mt-2"><span className="text-xs font-medium text-slate-700">Details/Recipe</span><textarea value={meal.details} onChange={e => handleMealChange(i, 'details', e.target.value)} className="w-full mt-1 p-2 border border-slate-300 rounded-lg text-sm resize-y focus:ring-2 focus:ring-emerald-500" rows="2" placeholder="Recipe or ingredients..." /></label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end pt-4 border-t border-slate-200">
                            <button onClick={handleSubmit} disabled={loading} className="flex items-center px-6 py-3 bg-linear-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-teal-700 shadow-lg disabled:bg-slate-400">
                                {loading ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />} Create Plan
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const AssignPlanView = () => {
        const handleBulkAssign = async () => { if (!selectedDays.length || !selectedPlan) return; const keys = selectedDays.map(dateToKey); await assignDatesToSelectedPlan(keys, `Plan "${selectedPlan.planName}" assigned to ${selectedDays.length} days!`); setSelectedDays([]); };
        const handleMonthAssign = async () => { if (!selectedPlan) return; await assignDatesToSelectedPlan(getMonthDateKeys(), `Plan "${selectedPlan.planName}" assigned to entire month!`); };
        const handleRangeAssign = async (e) => { const inputs = e.target.parentElement.querySelectorAll('input[type="date"]'); await assignDatesToSelectedPlan(getRangeDateKeys(inputs[0].value, inputs[1].value), `Plan "${selectedPlan.planName}" assigned to selected range!`); };

        return (
            <PageShell title="Assign Plan to Calendar" subtitle={`For ${selectedClient?.name}`} onBack={() => setView('CLIENT_DASHBOARD')}>
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6 mb-8">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><Utensils className="mr-3 text-emerald-600" /> Selected Plan</h2>
                    {selectedPlan ? (
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                            <div className="flex items-start justify-between">
                                <div><h3 className="font-bold text-slate-800 text-lg">{selectedPlan.planName}</h3><p className="text-sm text-slate-500">{selectedPlan.dietType} • {selectedPlan.calories} kcal</p>{selectedPlan.notes && <p className="text-sm text-slate-600 mt-2">{selectedPlan.notes}</p>}</div>
                                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">{selectedPlan.dietType}</span>
                            </div>
                        </div>
                    ) : <p className="text-slate-500 italic">No plan selected</p>}
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6 mb-8">
                    <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center"><Calendar className="mr-3 text-emerald-600" /> Assignment Options</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[{ mode: 'single', label: 'Assign to Single Day', desc: 'Click any available day to assign' }, { mode: 'multiple', label: 'Assign to Multiple Days', desc: 'Select multiple days first' }, { mode: 'month', label: 'Assign to Entire Month', desc: 'Assign to all days this month' }, { mode: 'custom', label: 'Assign to Custom Range', desc: 'Pick start and end dates' }].map(m => (
                            <button key={m.mode} onClick={() => setAssignmentMode(m.mode)} className={`p-4 rounded-xl border-2 transition-all ${assignmentMode === m.mode ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}>
                                <Calendar className="text-2xl mb-2 block" /><div className="font-semibold">{m.label}</div><div className="text-sm">{m.desc}</div>
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-4">
                        {assignmentMode === 'multiple' && selectedDays.length > 0 && <button onClick={handleBulkAssign} className="flex items-center px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 shadow-lg"><Save className="mr-2" /> Assign to {selectedDays.length} Selected Days</button>}
                        {assignmentMode === 'month' && <button onClick={handleMonthAssign} className="flex items-center px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 shadow-lg"><Save className="mr-2" /> Assign to Entire Month</button>}
                        {assignmentMode === 'custom' && <div className="flex gap-4 items-center"><input type="date" className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" /><span className="text-slate-500">to</span><input type="date" className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" /><button onClick={handleRangeAssign} className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium"><Save className="mr-1 inline" />Assign Range</button></div>}
                    </div>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6">
                    <CalendarView currentDate={currentDate} plans={availablePlans} selectedClient={selectedClient} changeMonth={changeMonth} setCurrentDate={setCurrentDate} selectedDays={selectedDays} onDaySelect={assignmentMode === 'single' ? d => handleCalendarAssignPlan(d) : assignmentMode === 'multiple' ? handleDaySelect : null} filterStartDate={filterStartDate} filterEndDate={filterEndDate} assignmentMode={assignmentMode} onViewPlan={handleViewPlan} isDeleteMode={false} />
                </div>
            </PageShell>
        );
    };

    const DeletePlanView = () => {
        const handleBulkRemove = async () => { if (!selectedDays.length) return; const keys = selectedDays.map(dateToKey); await removeDatesFromPlans(keys, `Plans removed from ${selectedDays.length} selected days!`); setSelectedDays([]); };
        const handleMonthRemove = async () => { await removeDatesFromPlans(getMonthDateKeys(), 'Plans removed from entire month!'); };
        const handleRangeRemove = async (e) => { const inputs = e.target.parentElement.querySelectorAll('input[type="date"]'); await removeDatesFromPlans(getRangeDateKeys(inputs[0].value, inputs[1].value), 'Plans removed from selected range!'); };

        return (
            <PageShell title="Delete Plans from Calendar" subtitle={`For ${selectedClient?.name}`} onBack={() => setView('CLIENT_DASHBOARD')}>
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6 mb-8">
                    <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center"><Trash2 className="mr-3 text-red-600" /> Flexible Deletion Options</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[{ mode: 'single', label: 'Remove from Single Day', desc: 'Click any day with a plan' }, { mode: 'multiple', label: 'Remove from Multiple Days', desc: 'Select multiple days first' }, { mode: 'month', label: 'Remove from Entire Month', desc: 'Remove plans from all days' }, { mode: 'custom', label: 'Remove from Custom Range', desc: 'Pick start and end dates' }].map(m => (
                            <button key={m.mode} onClick={() => setAssignmentMode(m.mode)} className={`p-4 rounded-xl border-2 transition-all ${assignmentMode === m.mode ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}>
                                <Calendar className="text-2xl mb-2 block" /><div className="font-semibold">{m.label}</div><div className="text-sm">{m.desc}</div>
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-4">
                        {assignmentMode === 'multiple' && selectedDays.length > 0 && <button onClick={handleBulkRemove} className="flex items-center px-6 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-lg"><Trash2 className="mr-2" /> Remove from {selectedDays.length} Selected Days</button>}
                        {assignmentMode === 'month' && <button onClick={handleMonthRemove} className="flex items-center px-6 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-lg"><Trash2 className="mr-2" /> Remove from Entire Month</button>}
                        {assignmentMode === 'custom' && <div className="flex gap-4 items-center"><input type="date" className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500" /><span className="text-slate-500">to</span><input type="date" className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500" /><button onClick={handleRangeRemove} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"><Trash2 className="mr-1 inline" />Remove Range</button></div>}
                    </div>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6">
                    <CalendarView currentDate={currentDate} plans={availablePlans} selectedClient={selectedClient} changeMonth={changeMonth} setCurrentDate={setCurrentDate} selectedDays={selectedDays} onDaySelect={assignmentMode === 'single' ? d => handleRemovePlan(dateToKey(d)) : assignmentMode === 'multiple' ? handleDaySelect : null} filterStartDate={filterStartDate} filterEndDate={filterEndDate} assignmentMode={assignmentMode} onViewPlan={handleViewPlan} isDeleteMode={true} />
                </div>
            </PageShell>
        );
    };

    const views = { CLIENT_LIST: ClientList, CLIENT_DASHBOARD: ClientDashboard, CREATE_PLAN: CreatePlanForm, ASSIGN_PLAN: AssignPlanView, DELETE_PLAN: DeletePlanView };
    const ActiveView = views[view] || ClientList;

    return (
        <>
            <ActiveView />
            {showPlanModal && <PlanDetailModal plan={selectedPlanForModal} date={selectedDateForModal} onClose={closePlanModal} />}
        </>
    );
};

export default DietitianAddPlanForm;
