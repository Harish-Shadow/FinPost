import React from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const App = () => {
  // Function to copy URL and show toast
  const copyToClipboard = () => {
    const postUrl = window.location.href; // Get current URL
    navigator.clipboard
      .writeText(postUrl)
      .then(() => {
        toast.success("Link copied to clipboard!");
      })
      .catch(() => {
        toast.error("Failed to copy link!");
      });
  };

  return (
    <div>
      <button onClick={copyToClipboard}>Copy Link</button>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default App;
