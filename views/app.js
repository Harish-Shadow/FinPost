import React from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const App = () => {
  // Example function to trigger a toast
  const showToast = () => {
    toast.success("User Logged In Successfully!");
  };

  return (
    <div>
      <button onClick={showToast}>Show Toast</button>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default App;
