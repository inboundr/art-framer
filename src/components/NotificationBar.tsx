interface NotificationBarProps {
  onClose?: () => void;
}

export function NotificationBar({ onClose }: NotificationBarProps) {
  return (
    <div className="flex items-center justify-between p-3 md:p-4 border-2 border-gray-200 bg-white">
      <div className="flex items-center flex-1 justify-center">
        <div className="flex items-start">
          <div className="flex flex-col items-start pr-2">
            <span className="text-gray-900 text-sm md:text-base">🚚</span>
          </div>
          <div className="flex flex-col items-start">
            <div className="text-gray-600 text-sm md:text-base leading-5 md:leading-6">
              <span className="text-gray-900 font-bold">Free shipping over $100</span>
              <span className="text-gray-600 hidden sm:inline"> on all framed art orders</span>
            </div>
          </div>
        </div>
      </div>
      <button 
        onClick={onClose}
        className="flex w-10 h-10 justify-center items-center rounded-lg hover:bg-gray-100 transition-colors"
      >
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6"
        >
          <path 
            d="M6 6L18 18M6 18L18 6" 
            stroke="currentColor" 
            strokeWidth="1.8" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
