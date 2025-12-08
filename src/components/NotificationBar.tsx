interface NotificationBarProps {
  onClose?: () => void;
}

export function NotificationBar({ onClose }: NotificationBarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 md:px-4 md:py-2.5 bg-gray-900 text-white text-sm">
      <div className="flex items-center flex-1 justify-center">
        <div className="flex items-start">
          <div className="flex flex-col items-start pr-2">
            <span className="text-white text-xs md:text-sm leading-none">🚚</span>
          </div>
          <div className="flex flex-col items-start">
            <div className="text-white text-xs md:text-sm leading-5 md:leading-5">
              <span className="font-semibold">Free shipping over $100</span>
              <span className="text-gray-200 hidden sm:inline"> on all framed art orders</span>
            </div>
          </div>
        </div>
      </div>
      <button 
        onClick={onClose}
        className="flex w-8 h-8 justify-center items-center rounded-md hover:bg-white/10 transition-colors"
      >
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4 text-white"
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
