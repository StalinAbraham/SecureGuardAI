import React from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  Trash2, 
  ArrowLeft, 
  Calendar, 
  Search,
  Shield,
  ExternalLink
} from 'lucide-react';

// URL history item type
interface HistoryItem {
  url: string;
  score: number;
  timestamp: number;
}

interface HistoryPageProps {
  history: HistoryItem[];
  onCheckUrl: (url: string) => void;
  onClearHistory: () => void;
  onBack: () => void;
  animateIn: boolean;
}

// Get safety level based on score
const getSafetyLevel = (score: number) => {
  if (score >= 80) return { level: 'Safe', color: 'text-green-600', bgColor: 'bg-green-100' };
  if (score >= 50) return { level: 'Potentially Risky', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
  return { level: 'Dangerous', color: 'text-red-600', bgColor: 'bg-red-100' };
};

const HistoryPage: React.FC<HistoryPageProps> = ({ 
  history, 
  onCheckUrl, 
  onClearHistory, 
  onBack,
  animateIn
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  
  // Filter history based on search term
  const filteredHistory = history.filter(item => 
    item.url.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Group history by date
  const groupedHistory = filteredHistory.reduce((groups, item) => {
    const date = new Date(item.timestamp).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(item);
    return groups;
  }, {} as Record<string, HistoryItem[]>);
  
  // Sort dates in descending order
  const sortedDates = Object.keys(groupedHistory).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });

  return (
    <div className={`transform transition-all duration-300 ease-in-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
        <div className="bg-indigo-50 p-4 flex justify-between items-center">
          <div className="flex items-center">
            <button 
              onClick={onBack}
              className="mr-3 text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-semibold text-indigo-800">URL Check History</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            {history.length > 0 && (
              <button 
                onClick={onClearHistory}
                className="flex items-center text-red-500 hover:text-red-700 transition-colors text-sm px-3 py-1 rounded-md hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear History
              </button>
            )}
          </div>
        </div>
        
        {/* Search bar */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search URLs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        
        {history.length === 0 ? (
          <div className="p-10 text-center">
            <Shield className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-700 mb-1">No History Yet</h3>
            <p className="text-gray-500">
              URLs you check will appear here for easy reference.
            </p>
            <button
              onClick={onBack}
              className="mt-4 inline-flex items-center text-indigo-600 hover:text-indigo-800"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Go back to check a URL
            </button>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-10 text-center">
            <Search className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-700 mb-1">No Results Found</h3>
            <p className="text-gray-500">
              No URLs match your search term.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sortedDates.map(date => (
              <div key={date} className="divide-y divide-gray-100">
                <div className="px-4 py-2 bg-gray-50 flex items-center">
                  <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-sm font-medium text-gray-600">{date}</span>
                </div>
                
                {groupedHistory[date].map((item, index) => {
                  const safety = getSafetyLevel(item.score);
                  return (
                    <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center max-w-[70%]">
                          {item.score >= 80 ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                          ) : item.score >= 50 ? (
                            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
                          )}
                          <div>
                            <p className="font-medium text-gray-800 truncate">{item.url}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(item.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <span className={`text-sm font-medium px-2 py-1 rounded-full ${safety.bgColor} ${safety.color}`}>
                            {item.score}
                          </span>
                          
                          <div className="flex space-x-1">
                            <button
                              onClick={() => onCheckUrl(item.url)}
                              className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                              title="Check again"
                            >
                              <Search className="h-4 w-4" />
                            </button>
                            
                            <a
                              href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                              title="Visit website"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;