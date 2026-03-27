import { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  closeOnOutsideClick?: boolean;
}

export default function Modal({
  open,
  onClose,
  closeOnOutsideClick = true,
  children,
}: ModalProps) {
  return (
    <div
      className={`fixed z-50 inset-0 flex justify-center items-start sm:items-center p-2 sm:p-4 transition-all duration-200 ease-out overflow-y-auto
      ${open ? "visible bg-black/30 backdrop-blur-[2px]" : "invisible bg-transparent"}
      `}
      onClick={closeOnOutsideClick ? onClose : () => {}}
    >
      <div
        className={`relative bg-white rounded-2xl shadow-xl p-4 sm:p-6 my-auto transition-all duration-200 ease-out 
        w-auto max-w-[98vw] sm:max-w-[95vw]
        ${open ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 p-1.5 rounded-full text-gray-400 bg-gray-100 hover:bg-gray-200 hover:text-gray-600 transition-colors duration-150"
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <div className="pt-6 sm:pt-0">
          {children}
        </div>
      </div>
    </div>
  );
}
