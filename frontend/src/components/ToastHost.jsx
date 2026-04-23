import React, { useEffect, useState } from "react";

let listeners = [];

export const showToast = (message, variant = "success") => {
  listeners.forEach((cb) => cb({ id: Date.now(), message, variant }));
};

const ToastHost = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const addToast = (toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 3500);
    };
    listeners.push(addToast);
    return () => {
      listeners = listeners.filter((l) => l !== addToast);
    };
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="toast-host">
      {toasts.map((t) => (
        <div key={t.id} className={`toast glass ${t.variant}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
};

export default ToastHost;

