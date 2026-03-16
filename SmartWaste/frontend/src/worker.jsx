import React from 'react'

export default function worker() {
  return (
<>

<>
 
  
  <div className="max-w-7xl mx-auto  py-25">
    {/* Header Section */}
    <div className="text-center mb-10">
      <span className="inline-block bg-purple-700 text-white px-4 py-1 rounded-full text-sm mb-2">
        AI Monitoring System
      </span>
      <h1 className="text-4xl font-bold text-white mb-2">
        Automated Spill &amp; Garbage Detection
      </h1>
      <p className="text-gray-400 max-w-3xl mx-auto">
        AI-powered waste management system that detects spills, garbage, and
        maintenance issues, automatically assigning tasks to the cleaning crew.
      </p>
    </div>
    {/* Dashboard Container */}
    <div className="flex flex-col md:flex-row gap-6">
      {/* Left Panel - Task Dashboard */}
      <div className="w-full md:w-1/2">
        <div className="bg-purple-800 rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Task Dashboard</h2>
                <p className="">Your assigned cleaning tasks</p>
              </div>
              <span className=" bg-opacity-50 px-3 py-1 rounded-full text-sm">
                On Duty
              </span>
            </div>
          </div>
          {/* Task Stats */}
          <div className="bg-gray-800 p-6">
            <div className="flex justify-between mb-6">
              <div>
                <p className="text-gray-400 text-sm">Tasks Assigned</p>
                <p className="text-2xl font-bold text-white">5</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Completed Today</p>
                <p className="text-2xl font-bold text-white">3</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Response Time</p>
                <p className="text-2xl font-bold text-green-500">8 min</p>
              </div>
            </div>
            
          </div>
          {/* Recent Tasks */}
          <div className="p-6 bg-gray-800">
            <h3 className="text-lg font-medium text-white mb-4">
              Assigned Tasks
            </h3>
            {/* Task 1 - Urgent */}
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-start">
                <div className="flex items-start space-x-3">
                  <div className="bg-red-500 p-2 rounded-lg mt-1">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-white">
                      Coffee Spill - Building A
                    </h4>
                    <p className="text-sm text-gray-400">
                      Floor 2, Hallway near Room 204
                    </p>
                    <div className="flex items-center mt-2">
                      <span className="bg-red-500 bg-opacity-20 text-red-400 text-xs px-2 py-1 rounded">
                        Urgent
                      </span>
                      <span className="text-gray-500 text-xs ml-3">
                        Detected 6 min ago
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">
                    Accept
                  </button>
                  <button className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm">
                    View
                  </button>
                </div>
              </div>
            </div>
            {/* Task 2 - In Progress */}
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-start">
                <div className="flex items-start space-x-3">
                  <div className="bg-yellow-500 p-2 rounded-lg mt-1">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-white">
                      Overflowing Trash - Building B
                    </h4>
                    <p className="text-sm text-gray-400">Cafeteria, Bin #3</p>
                    <div className="flex items-center mt-2">
                      <span className="bg-yellow-500 bg-opacity-20 text-yellow-400 text-xs px-2 py-1 rounded">
                        In Progress
                      </span>
                      <span className="text-gray-500 text-xs ml-3">
                        Started 12 min ago
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">
                    Complete
                  </button>
                </div>
              </div>
            </div>
            {/* Task 3 - Standard */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-500 p-2 rounded-lg mt-1">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-white">
                      Paper Debris - Building A
                    </h4>
                    <p className="text-sm text-gray-400">
                      Floor 1, Conference Room C
                    </p>
                    <div className="flex items-center mt-2">
                      <span className="bg-blue-500 bg-opacity-20 text-blue-400 text-xs px-2 py-1 rounded">
                        Standard
                      </span>
                      <span className="text-gray-500 text-xs ml-3">
                        Detected 23 min ago
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">
                    Accept
                  </button>
                  <button className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm">
                    View
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <button className="text-purple-400 hover:text-purple-300 text-sm">
                View All Tasks
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Right Panel - Task Details and Map */}
      <div className="w-full md:w-1/2">
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-6">
            How AI Detection Works
          </h2>
          <div className="space-y-6">
            {/* AI Detection */}
            <div className="flex items-start space-x-4">
              <div className="bg-purple-700 p-3 rounded-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-white">AI Camera Detection</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Our AI-powered CCTV cameras scan facility areas for spills,
                  garbage, and maintenance issues in real-time.
                </p>
              </div>
            </div>
            {/* Task Assignment */}
            <div className="flex items-start space-x-4">
              <div className="bg-purple-700 p-3 rounded-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-white">
                  Automatic Task Assignment
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  The system automatically creates and assigns tasks to
                  available cleaning crew members based on proximity and
                  workload.
                </p>
              </div>
            </div>
            {/* Status Updates */}
            <div className="flex items-start space-x-4">
              <div className="bg-purple-700 p-3 rounded-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-white">Status Tracking</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Update task status as you work through your assignments.
                  Verification photos may be required for task completion.
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* Performance Metrics */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Your Performance</h2>
            <span className="text-sm text-gray-400">Last 7 days</span>
          </div>
          {/* Performance Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-400">Response Time</p>
              <p className="text-2xl font-bold text-green-400">8.2 min</p>
              <p className="text-xs text-green-500">↓ 12% from last week</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-400">Tasks Completed</p>
              <p className="text-2xl font-bold text-white">27</p>
              <p className="text-xs text-green-500">↑ 8% from last week</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-400">Quality Score</p>
              <p className="text-2xl font-bold text-white">94%</p>
              <p className="text-xs text-green-500">↑ 2% from last week</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-400">Team Ranking</p>
              <p className="text-2xl font-bold text-purple-400">#3</p>
              <p className="text-xs text-green-500">↑ 2 positions</p>
            </div>
          </div>
          {/* Facility Map Placeholder */}
          <div className="bg-gray-700 rounded-lg p-4 h-64 flex items-center justify-center">
            <div className="text-center">
              <svg
                className="w-12 h-12 text-gray-500 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
              <p className="text-gray-400 mt-2">
                Facility Map with Live Task Locations
              </p>
              <button className="mt-2 text-sm text-purple-400 hover:text-purple-300">
                Expand Map
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</>
</>
  )
}
