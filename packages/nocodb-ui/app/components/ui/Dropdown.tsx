"use client";

import { useState, useRef, useEffect, useCallback, createContext, useContext } from "react";
import { ChevronDown } from "lucide-react";

interface DropdownContextValue {
  isOpen: boolean;
  close: () => void;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

export interface DropdownProps {
  children: React.ReactNode;
  trigger?: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}

export function Dropdown({ children, trigger, align = "left", className = "" }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setIsOpen(false), []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <DropdownContext.Provider value={{ isOpen, close }}>
      <div ref={dropdownRef} className={`relative inline-block ${className}`}>
        {/* Trigger */}
        <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
          {trigger || (
            <button className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Options
              <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>

        {/* Menu */}
        {isOpen && (
          <div
            className={`absolute z-50 mt-1 min-w-[160px] bg-white border border-gray-200 rounded-lg shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100 ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            {children}
          </div>
        )}
      </div>
    </DropdownContext.Provider>
  );
}

export interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  icon?: React.ReactNode;
}

export function DropdownItem({ children, onClick, disabled, danger, icon }: DropdownItemProps) {
  const context = useContext(DropdownContext);

  const handleClick = () => {
    if (disabled) return;
    onClick?.();
    context?.close();
  };

  return (
    <button
      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors
        ${disabled ? "text-gray-400 cursor-not-allowed" : ""}
        ${danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-100"}
      `}
      onClick={handleClick}
      disabled={disabled}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
    </button>
  );
}

export function DropdownDivider() {
  return <div className="my-1 border-t border-gray-200" />;
}

export function DropdownLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
      {children}
    </div>
  );
}
