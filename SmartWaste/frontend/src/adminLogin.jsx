import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AdminLogin = ({ setIsAdmin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState({ text: "", color: "" });
  const [showToast, setShowToast] = useState(false);
  const [toastTimeout, setToastTimeout] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowToast(true);
    }, 1000);
    setToastTimeout(timeout);

    return () => {
      if (toastTimeout) clearTimeout(toastTimeout);
    };
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();

    if (username === "admin" && password === "admin") {
      setMessage({ text: "Login Successful!", color: "text-green-500" });
      setTimeout(() => {
        setIsAdmin(true);
        navigate("/admin-dashboard");
      }, 1500);
    } else {
      setMessage({ text: "Invalid Credentials!", color: "text-red-500" });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setMessage({ text: "Copied to clipboard!", color: "text-green-500" });
    setTimeout(() => setMessage({ text: "", color: "" }), 2000);
  };

  const closeToast = () => {
    setShowToast(false);
    if (toastTimeout) clearTimeout(toastTimeout);
  };

  return (
    <div className="flex justify-center items-center h-screen bg-[#171717] relative">
      {/* Toast Notification */}
      {showToast && (
        <div className="absolute top-4 right-4 w-80 bg-gray-800 border-l-4 border-yellow-500 rounded-lg shadow-lg p-4 z-50 animate-fade-in">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-white mb-2">Admin Credentials</h3>
              <div className="flex items-center mb-2">
                <p className="text-gray-300 mr-2">Username:</p>
                <p className="text-white font-mono">admin</p>
                <button
                  onClick={() => copyToClipboard("admin")}
                  className="ml-2 bg-gray-700 text-xs text-white px-2 py-1 rounded hover:bg-gray-600"
                >
                  Copy
                </button>
              </div>
              <div className="flex items-center">
                <p className="text-gray-300 mr-2">Password:</p>
                <p className="text-white font-mono">••••••••</p>
                <button
                  onClick={() => copyToClipboard("admin")}
                  className="ml-2 bg-gray-700 text-xs text-white px-2 py-1 rounded hover:bg-gray-600"
                >
                  Copy
                </button>
              </div>
            </div>
            <button
              onClick={closeToast}
              className="text-red-500 hover:text-red-400 text-xl font-bold"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Login Form */}
      <div className="bg-gray-900 p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold text-center mb-4 text-white">
          Admin Login
        </h2>

        {message.text && (
          <p className={`text-center font-semibold mb-4 ${message.color}`}>
            {message.text}
          </p>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-300 font-semibold">Username</label>
            <input
              type="text"
              className="w-full px-4 py-2 mt-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 font-semibold">Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 mt-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#1e8449] text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-300 cursor-pointer"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
