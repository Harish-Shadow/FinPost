import React, { useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const App = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("msg") === "registerSuccess") {
      toast.success("Registration Successful!");
    }
    if (params.get("msg") === "loginSuccess") {
      toast.success("Login Successful!");
    }
    if (params.get("msg") === "error") {
      toast.error("Something went wrong!");
    }
  }, []);

  return <ToastContainer position="top-right" autoClose={3000} />;
};

export default App;
