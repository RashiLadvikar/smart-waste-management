import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, CheckCircle2, Clock, AlertTriangle, Filter, Search, ChevronDown, ChevronUp, X } from 'lucide-react';

export default function TaskStatsPage() {
    const [stats, setStats] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);

    // Filters
    const [filters, setFilters] = useState({
        status: '',
        priority: '',
        severity: '',
        department: '',
        detectedClass: ''
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    // Sorting
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');

    // Fetch statistics
    const fetchStats = async () => {
        try {
            const response = await fetch('https://smartwatemobile-1.onrender.com/api/task/detections/stats/summary');
            const result = await response.json();
            if (result.success) {
                setStats(result.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    // Fetch tasks with filters
    const fetchTasks = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: currentPage,
                limit: 10,
                sortBy,
                sortOrder,
                ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
            });

            const response = await fetch(`https://smartwatemobile-1.onrender.com/api/task/detections?${params}`);
            const result = await response.json();

            if (result.success) {
                setTasks(result.data);
                setTotalPages(result.pagination.pages);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchTasks();
    }, [currentPage, filters, sortBy, sortOrder]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setFilters({
            status: '',
            priority: '',
            severity: '',
            department: '',
            detectedClass: ''
        });
        setCurrentPage(1);
    };

    const getStatusColor = (status) => {
        const colors = {
            'Incomplete': 'bg-yellow-500',
            'In Progress': 'bg-blue-500',
            'Completed': 'bg-green-500',
            'Cancelled': 'bg-red-500'
        };
        return colors[status] || 'bg-gray-500';
    };

    const getPriorityColor = (priority) => {
        const colors = {
            'High': 'text-red-500',
            'Medium': 'text-yellow-500',
            'Low': 'text-green-500'
        };
        return colors[priority] || 'text-gray-500';
    };

    if (!stats) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#1E8449]"></div>
            </div>
        );
    }

    const { overall = {}, byDepartment = [], byClass = [] } = stats;

    return (
        <div className="min-h-screen bg-black text-white p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <BarChart3 className="w-8 h-8 text-[#1E8449]" />
                    Task Statistics & Details
                </h1>
                <p className="text-gray-400">Comprehensive overview of all detection tasks</p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-neutral-900 border border-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Total Tasks</p>
                            <p className="text-3xl font-bold text-[#1E8449] mt-1">{overall.total || 0}</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-[#1E8449]" />
                    </div>
                </div>

                <div className="bg-neutral-900 border border-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Pending</p>
                            <p className="text-3xl font-bold text-yellow-500 mt-1">{overall.incomplete || 0}</p>
                        </div>
                        <Clock className="w-8 h-8 text-yellow-500" />
                    </div>
                </div>

                <div className="bg-neutral-900 border border-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Completed</p>
                            <p className="text-3xl font-bold text-green-500 mt-1">{overall.completed || 0}</p>
                        </div>
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                </div>

                <div className="bg-neutral-900 border border-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">High Priority</p>
                            <p className="text-3xl font-bold text-red-500 mt-1">{overall.highPriority || 0}</p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                </div>
            </div>

            {/* Department & Class Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-neutral-900 border border-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">By Department</h3>
                    <div className="space-y-3">
                        {byDepartment.map((dept, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <span className="capitalize text-gray-300">{dept._id}</span>
                                <span className="text-[#1E8449] font-semibold">{dept.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-neutral-900 border border-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">By Class</h3>
                    <div className="space-y-3">
                        {byClass.map((cls, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <span className="capitalize text-gray-300">{cls._id}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-gray-400">
                                        {(cls.avgConfidence * 100).toFixed(1)}% avg
                                    </span>
                                    <span className="text-[#1E8449] font-semibold">{cls.count}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-neutral-900 border border-gray-800 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Filter className="w-5 h-5" />
                        Filters
                    </h3>
                    <button
                        onClick={clearFilters}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        Clear All
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="bg-neutral-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1E8449]"
                    >
                        <option value="">All Status</option>
                        <option value="Incomplete">Incomplete</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>

                    <select
                        value={filters.priority}
                        onChange={(e) => handleFilterChange('priority', e.target.value)}
                        className="bg-neutral-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1E8449]"
                    >
                        <option value="">All Priority</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>

                    <select
                        value={filters.severity}
                        onChange={(e) => handleFilterChange('severity', e.target.value)}
                        className="bg-neutral-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1E8449]"
                    >
                        <option value="">All Severity</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>

                    <select
                        value={filters.department}
                        onChange={(e) => handleFilterChange('department', e.target.value)}
                        className="bg-neutral-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1E8449]"
                    >
                        <option value="">All Departments</option>
                        <option value="cleaning">Cleaning</option>
                        <option value="spill">Spill</option>
                    </select>

                    <select
                        value={filters.detectedClass}
                        onChange={(e) => handleFilterChange('detectedClass', e.target.value)}
                        className="bg-neutral-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1E8449]"
                    >
                        <option value="">All Classes</option>
                        <option value="bin">Bin</option>
                        <option value="garbage">Garbage</option>
                        <option value="spills">Spills</option>
                    </select>
                </div>
            </div>

            {/* Tasks List */}
            <div className="bg-neutral-900 border border-gray-800 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-gray-800">
                    <h3 className="text-lg font-semibold">All Tasks ({overall.total || 0})</h3>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E8449] mx-auto"></div>
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        No tasks found
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-neutral-800 text-sm">
                                <tr>
                                    <th className="px-4 py-3 text-left">Image</th>
                                    <th className="px-4 py-3 text-left">Class</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-left">Priority</th>
                                    <th className="px-4 py-3 text-left">Severity</th>
                                    <th className="px-4 py-3 text-left">Department</th>
                                    <th className="px-4 py-3 text-left">Confidence</th>
                                    <th className="px-4 py-3 text-left">Location</th>
                                    <th className="px-4 py-3 text-left">Created</th>
                                    <th className="px-4 py-3 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {tasks.map((task) => (
                                    <tr key={task._id} className="hover:bg-neutral-800 transition-colors">
                                        <td className="px-4 py-3">
                                            <img
                                                src={task.imagePath}
                                                alt={task.detectedClass}
                                                className="w-16 h-16 object-cover rounded cursor-pointer hover:scale-105 transition-transform"
                                                onClick={() => setSelectedTask(task)}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="capitalize font-semibold text-[#1E8449]">
                                                {task.detectedClass}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(task.status)} text-white`}>
                                                {task.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`font-semibold ${getPriorityColor(task.priority)}`}>
                                                {task.priority}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`font-semibold ${getPriorityColor(task.severity)}`}>
                                                {task.severity}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 capitalize">{task.department}</td>
                                        <td className="px-4 py-3">
                                            {(task.confidenceScore * 100).toFixed(1)}%
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-400">
                                            {task.location}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-400">
                                            {new Date(task.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => setSelectedTask(task)}
                                                className="text-[#1E8449] hover:text-[#27ae60] text-sm font-semibold"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-800 flex items-center justify-between">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 bg-neutral-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-700 transition-colors"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-400">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 bg-neutral-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-700 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Task Detail Modal */}
            {selectedTask && (
                <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-900 border border-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold">Task Details</h2>
                                <button
                                    onClick={() => setSelectedTask(null)}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Image */}
                                <div>
                                    <img
                                        src={selectedTask.imagePath}
                                        alt={selectedTask.detectedClass}
                                        className="w-full rounded-lg"
                                    />
                                </div>

                                {/* Details */}
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-gray-400 text-sm">Detected Class</p>
                                        <p className="text-xl font-semibold capitalize text-[#1E8449]">
                                            {selectedTask.detectedClass}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-gray-400 text-sm">Status</p>
                                            <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${getStatusColor(selectedTask.status)} text-white mt-1`}>
                                                {selectedTask.status}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 text-sm">Priority</p>
                                            <p className={`text-lg font-semibold ${getPriorityColor(selectedTask.priority)}`}>
                                                {selectedTask.priority}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-gray-400 text-sm">Severity</p>
                                            <p className={`text-lg font-semibold ${getPriorityColor(selectedTask.severity)}`}>
                                                {selectedTask.severity}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 text-sm">Department</p>
                                            <p className="text-lg font-semibold capitalize">{selectedTask.department}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-gray-400 text-sm">Confidence Score</p>
                                        <p className="text-lg font-semibold">
                                            {(selectedTask.confidenceScore * 100).toFixed(2)}%
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-gray-400 text-sm">Location</p>
                                        <p className="text-lg font-semibold">{selectedTask.location}</p>
                                    </div>

                                    {selectedTask.latitude && selectedTask.longitude && (
                                        <div>
                                            <p className="text-gray-400 text-sm">GPS Coordinates</p>
                                            <p className="text-sm">
                                                {selectedTask.latitude.toFixed(6)}, {selectedTask.longitude.toFixed(6)}
                                            </p>
                                        </div>
                                    )}

                                    <div>
                                        <p className="text-gray-400 text-sm">Description</p>
                                        <p className="text-sm">{selectedTask.description}</p>
                                    </div>

                                    <div>
                                        <p className="text-gray-400 text-sm">Created At</p>
                                        <p className="text-sm">
                                            {new Date(selectedTask.createdAt).toLocaleString()}
                                        </p>
                                    </div>

                                    {selectedTask.assignedWorker && (
                                        <div>
                                            <p className="text-gray-400 text-sm">Assigned Worker</p>
                                            <p className="text-sm">{selectedTask.assignedWorker}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
