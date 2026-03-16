import React, { useState } from 'react';
import axios from 'axios';

export default function WorkerForm() {
  const url = import.meta.env.VITE_API_URL;
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    location: '', 
    startDate: '',
    shift: '',
    gender: '',
    age: '',
    emergencyResponder: false,
    additionalDetails: ''
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
        await axios.post(`${url}worker`, formData);
        alert('Worker registered successfully!');
        setFormData({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            department: '',
            location: '',
            startDate: '',
            shift: '',
            gender: '',
            age: '',
            emergencyResponder: false,
            additionalDetails: ''
        });
    } catch (error) {
        // Display detailed error message from the server
        const errorMessage = error.response?.data?.message || 'Error registering worker';
        alert(errorMessage);
        console.error('Error:', error);
    } finally {
        setIsLoading(false);
    }
};

  return (
    <div className="py-20 bg-gray-50 dark:bg-neutral-900 text-white min-h-screen p-8">
      <div className="text-center mb-8">
        <div className="inline-block px-3 py-1 bg-teal-600 rounded-full text-sm mb-2">
          Personnel Management
        </div>
        <h1 className="text-2xl font-bold mb-2">Worker Registration Platform</h1>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Manage your security personnel effectively by registering new workers, assigning positions and monitoring access levels.
        </p>
      </div>
      
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-teal-600 dark:bg-teal-700 p-4 text-white rounded">
            <h2 className="text-xl font-bold mb-4">Register New Worker</h2>
            <p className="text-sm mb-4">Fill out the form to register a new worker and assign their position</p>
          </div>
          <div className="bg-gray-800 p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="bg-gray-700 p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <h3 className="text-md font-medium">Personal Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm text-gray-400 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm text-gray-400 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>
                </div>
                
                <div className="mt-3">
                  <label htmlFor="email" className="block text-sm text-gray-400 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
                
                <div className="mt-3">
                  <label htmlFor="phone" className="block text-sm text-gray-400 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="bg-gray-700 p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                      <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                    </svg>
                  </span>
                  <h3 className="text-md font-medium">Employment Details</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="department" className="block text-sm text-gray-400 mb-1">
                      Department *
                    </label>
                    <select
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    >
                      <option value="">Select a department</option> {/* Placeholder option */}
                      <option value="cleaning">Cleaning</option>
                      <option value="water">Water</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
  <label htmlFor="location" className="block text-sm text-gray-400 mb-1">
    Working Location *
  </label>
  <input
    type="text"
    id="location"
    name="location"
    value={formData.location}
    onChange={handleChange}
    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
    placeholder="Enter working location"
    required
  />
</div>
                </div>
                
                <div className="mt-3">
                  <label htmlFor="startDate" className="block text-sm text-gray-400 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="bg-gray-700 p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <h3 className="text-md font-medium">Additional Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="shift" className="block text-sm text-gray-400 mb-1">
                      Shift *
                    </label>
                    <select
                      id="shift"
                      name="shift"
                      value={formData.shift}
                      onChange={handleChange}
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    >
                      <option value="">Select preferrred shift</option> {/* Placeholder option */}
                      <option value="morning">Morning</option>
                      <option value="evening">Evening</option>
                      <option value="night">Night</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="gender" className="block text-sm text-gray-400 mb-1">
                      Gender *
                    </label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    >
                      <option value="">Select gender</option> {/* Placeholder option */}
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="mt-3">
                  <label htmlFor="age" className="block text-sm text-gray-400 mb-1">
                    Age *
                  </label>
                  <input
                    type="number"
                    id="age"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>

                <div className="mt-3">
                  <label htmlFor="emergencyResponder" className="block text-sm text-gray-400 mb-1">
                    Emergency Responder *
                  </label>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="emergencyResponder"
                      name="emergencyResponder"
                      checked={formData.emergencyResponder}
                      onChange={handleChange}
                      className="w-5 h-5 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <span className="ml-2">Yes</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="additionalDetails" className="block text-sm text-gray-400 mb-1">
                  Additional Details
                </label>
                <textarea
                  id="additionalDetails"
                  name="additionalDetails"
                  value={formData.additionalDetails}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Provide any additional details about the worker"
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              
              <div className="pt-4">
                <div className="text-sm text-gray-400 mb-4">
                  Fields marked with * are required
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setFormData({
                      firstName: '',
                      lastName: '',
                      email: '',
                      phone: '',
                      department: '',
                      location: '',
                      startDate: '',
                      shift: '',
                      gender: '',
                      age: '',
                      emergencyResponder: false,
                      additionalDetails: ''
                    })}
                    className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      isLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isLoading ? 'Registering...' : 'Register Worker'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">How Worker Registration Works</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-gray-700 p-3 rounded-full mt-1 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">Worker Registration</h3>
                  <p className="text-sm text-gray-400">Register new workers by providing details about their personal information and employment details.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-gray-700 p-3 rounded-full mt-1 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 4h3a3 3 0 006 0h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm2.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm2.45 4a2.5 2.5 0 10-4.9 0h4.9zM12 9a1 1 0 100 2h3a1 1 0 100-2h-3zm-1 4a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">Access Assignment</h3>
                  <p className="text-sm text-gray-400">Assign appropriate access levels based on position and department to control facility security.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-gray-700 p-3 rounded-full mt-1 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">Credential Issuance</h3>
                  <p className="text-sm text-gray-400">Workers are automatically issued security credentials that match their assigned access level.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-gray-700 p-3 rounded-full mt-1 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">Monitoring & Tracking</h3>
                  <p className="text-sm text-gray-400">Track worker activity and location throughout the facility for security and efficiency.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div> 
  );
}
