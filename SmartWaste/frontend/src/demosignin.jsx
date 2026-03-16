import { useSignIn } from "@clerk/clerk-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

// Export the button component separately
export const DemoSignInButton = ({ className = "", buttonText = "Login as Guest" }) => {
  const { signIn, isLoaded } = useSignIn();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();

  const handleDemoLogin = async () => {
    if (!isLoaded || isLoggingIn) return;

    try {
      setIsLoggingIn(true);
      
      // Perform sign in
      await signIn.create({
        identifier: "trioscoet26@gmail.com",
        password: "12345678",
      });
      
      // Instead of redirecting and waiting for success,
      // just navigate directly to the report page
      navigate("/");
      
      // Force a page reload after navigation
      setTimeout(() => {
        window.location.reload();
      }, 100);
      
    } catch (err) {
      console.error("Demo sign-in failed:", err);
      setIsLoggingIn(false);
    }
  };

  return (
    <button
      onClick={handleDemoLogin}
      disabled={isLoggingIn}
      className={`bg-[#1e8449] text-white px-4 py-2 rounded-lg shadow-md hover:bg-[#166534] active:shadow-lg transition ${
        isLoggingIn ? 'opacity-75 cursor-not-allowed' : ''
      } ${className}`}
    >
      {isLoggingIn ? 'Signing in...' : buttonText}
    </button>
  );
};

// Simple component that just renders the button
const DemoSignIn = () => {
  return <DemoSignInButton />;
};

export default DemoSignIn;
