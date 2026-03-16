import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useAuth
} from "@clerk/clerk-react";
import DemoSignIn, { DemoSignInButton } from './demosignin';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [lastAttemptedPath, setLastAttemptedPath] = useState("");
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleNavigation = (path) => {
    if (!isSignedIn && path !== "/") {
      setLastAttemptedPath(path);
      setShowLoginPopup(true);
      return;
    }
    
    setIsMobileMenuOpen(false);
    navigate(path);
  };

  const closeLoginPopup = () => {
    setShowLoginPopup(false);
  };

  const handleSuccessfulLogin = () => {
    setShowLoginPopup(false);
    if (lastAttemptedPath) {
      navigate(lastAttemptedPath);
      setLastAttemptedPath("");
    }
  };

  // Close popup when user signs in
  useEffect(() => {
    if (isSignedIn && showLoginPopup) {
      handleSuccessfulLogin();
    }
  }, [isSignedIn, showLoginPopup, lastAttemptedPath]);

  return (
    <>
      
      <header id="header" className="bg-neutral-900 text-white fixed w-full z-50">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <a href="/" className="text-2xl font-bold">
              <span className="text-[#1E8449]">Smart</span>
              <span className="text-[#3498DB]">Waste</span>
            </a>
      
            {/* Mobile menu button */}
            <button
              className="md:hidden flex items-center"
              aria-label="Toggle navigation menu"
              onClick={toggleMobileMenu}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
      
            {/* Responsive navigation */}
            <ul
              className={`absolute md:static top-16 left-0 w-full md:w-auto bg-neutral-900 md:bg-transparent p-4 md:p-0 rounded-lg shadow-lg md:shadow-none transform transition-all duration-300 ease-in-out ${
                isMobileMenuOpen
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 -translate-y-full md:opacity-100 md:translate-y-0 hidden md:flex"
              }`}
            >
              {[
                { to: "/", label: "Home" },
                { to: "/review", label: "Sentiment Analysis" },
                { to: "/report", label: "Report Waste" },
                { to: "/reward", label: "GreenCoins" },
                { to: "/marketplace", label: "Marketplace" },
              ].map((item, index) => (
                <li key={index}>
                  <button
                    onClick={() => handleNavigation(item.to)}
                    className="block py-2 px-4 md:py-0 text-left w-full hover:text-[#F39C12] transition-colors duration-300"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
      
              {/* Authentication Section */}
              <div className="flex gap-4 justify-center mt-4 md:mt-0">
                <li onClick={() => setIsMobileMenuOpen(false)}>
                  <SignedOut>
                    <SignInButton className="bg-[#1e8449] text-white px-4 py-2 rounded-lg shadow-md hover:bg-[#166534] active:shadow-lg transition cursor-pointer" />
                  </SignedOut>
                  <SignedIn>
                    <UserButton />
                  </SignedIn>
                </li>
                <li>
                  <button 
                    onClick={() => navigate("/admin")}
                    className="bg-[#1e8449] text-white px-4 py-2 rounded-lg shadow-md hover:bg-[#166534] active:shadow-lg transition cursor-pointer"
                  >
                    Admin
                  </button>
                </li>
                <li>
                  <SignedOut>
                    <DemoSignInButton />
                  </SignedOut>
                </li>
              </div>
            </ul>
          </div>
        </nav>
      </header>

      {/* Refined Login Popup Modal with Subtle Blurred Background */}
      {showLoginPopup && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/80 flex items-center justify-center z-50 transition-all duration-300">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 max-w-md w-full mx-4 shadow-lg border border-gray-200 transform animate-popup">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="text-[#1E8449] rounded-full p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-800">Login Required</h2>
              </div>
              <button 
                onClick={closeLoginPopup}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="border-l-4 border-[#1E8449] pl-3 py-2 mb-5">
              <p className="text-gray-700">
                Please sign in to access this feature. You can create an account or login with Google.
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <SignInButton className="bg-gradient-to-r from-[#1E8449] to-[#166534] w-full text-white px-6 py-3 rounded-lg font-medium text-center shadow-md hover:from-[#166534] hover:to-[#0E4429] active:shadow-lg transition-all duration-200 cursor-pointer" />
              
              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-gray-200 w-full"></div>
                <div className="border-t border-gray-200 w-full"></div>
              </div>
              
              {/* Use the DemoSignInButton in the popup */}
              <DemoSignInButton 
                className="w-full py-3" 
                buttonText="Login as Guest"
              />
              
            </div>
            
            <p className="text-xs text-gray-500 mt-4 text-center">
              Click on Sign in to Continue With Google
            </p>
          </div>
        </div>
      )}

      {/* Add some global styles for animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
        @keyframes popup {
          0% { opacity: 0; transform: scale(0.9) translateY(-20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-popup {
          animation: popup 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
}
