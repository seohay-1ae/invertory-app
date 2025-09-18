"use client";

import { useState, useEffect } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "warning" | "info";
  duration?: number;
  onClose?: () => void;
}

export function Toast({ message, type = "info", duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300); // 애니메이션 완료 후 onClose 호출
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getToastStyles = () => {
    const baseStyles = {
      position: "fixed" as const,
      top: "20px",
      right: "20px",
      padding: "12px 16px",
      borderRadius: "8px",
      color: "white",
      fontWeight: "500",
      fontSize: "14px",
      zIndex: 9999,
      transform: isVisible ? "translateX(0)" : "translateX(100%)",
      transition: "transform 0.3s ease-in-out",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      maxWidth: "300px",
      wordWrap: "break-word" as const,
    };

    switch (type) {
      case "success":
        return { ...baseStyles, backgroundColor: "#10b981" };
      case "error":
        return { ...baseStyles, backgroundColor: "#ef4444" };
      case "warning":
        return { ...baseStyles, backgroundColor: "#f59e0b" };
      case "info":
      default:
        return { ...baseStyles, backgroundColor: "#3b82f6" };
    }
  };

  return (
    <div style={getToastStyles()}>
      {message}
    </div>
  );
}

// 토스트 컨텍스트 및 훅
import { createContext, useContext, ReactNode } from "react";

interface ToastContextType {
  showToast: (message: string, type?: "success" | "error" | "warning" | "info") => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: "success" | "error" | "warning" | "info" }>>([]);

  const showToast = (message: string, type: "success" | "error" | "warning" | "info" = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
