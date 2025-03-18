import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  ExternalLink, 
  Info, 
  Loader2, 
  Key, 
  X, 
  Home, 
  History, 
  Trash2, 
  Eye, 
  EyeOff,
  Bot,
  Zap,
  ArrowLeft
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import HistoryPage from './HistoryPage';

// URL safety check criteria and scoring
const checkURL = (url: string) => {
  let score = 100;
  const warnings: string[] = [];
  const positives: string[] = [];
  
  // Basic URL validation
  if (!url) {
    return { score: 0, warnings: ['Please enter a URL'], positives: [] };
  }
  
  // Normalize URL for analysis
  let normalizedUrl = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    normalizedUrl = 'https://' + url;
  }
  
  try {
    // Try to parse the URL to see if it's valid
    new URL(normalizedUrl);
  } catch (e) {
    return { 
      score: 10, 
      warnings: ['Invalid URL format. Please enter a valid domain name or complete URL'],
      positives: []
    };
  }
  
  const parsedUrl = new URL(normalizedUrl);
  const domain = parsedUrl.hostname;
  
  // Check for HTTPS
  if (parsedUrl.protocol !== 'https:') {
    score -= 10; // Reduced penalty from 20 to 10
    warnings.push('Website does not use HTTPS (secure connection)');
  } else {
    positives.push('Uses secure HTTPS connection');
  }
  
  // Check for suspicious TLDs
  const suspiciousTLDs = ['.xyz', '.tk', '.ml', '.ga', '.cf', '.gq', '.top', '.work', '.date', '.racing'];
  const tld = '.' + domain.split('.').slice(-1)[0];
  
  if (suspiciousTLDs.includes(tld)) {
    score -= 15;
    warnings.push(`Domain uses potentially suspicious TLD (${tld})`);
  }
  
  // Check for URL shorteners
  const shortenerDomains = ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd', 'buff.ly', 'adf.ly', 'tiny.cc'];
  if (shortenerDomains.some(shortener => domain.includes(shortener))) {
    score -= 25;
    warnings.push('URL appears to be a shortened link, which can hide the actual destination');
  }
  
  // Check for excessive subdomains
  const subdomainCount = domain.split('.').length - 2;
  if (subdomainCount > 3) {
    score -= 10;
    warnings.push('URL contains an unusual number of subdomains');
  }
  
  // Check for IP address instead of domain name
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipRegex.test(domain)) {
    score -= 30;
    warnings.push('URL uses an IP address instead of a domain name');
  }
  
  // Check for suspicious words in URL
  const suspiciousWords = ['login', 'signin', 'verify', 'secure', 'account', 'update', 'confirm', 'paypal', 'banking', 'password'];
  const urlLower = normalizedUrl.toLowerCase();
  const foundSuspiciousWords = suspiciousWords.filter(word => urlLower.includes(word));
  
  if (foundSuspiciousWords.length > 0) {
    score -= 5 * foundSuspiciousWords.length;
    warnings.push(`URL contains potentially suspicious terms: ${foundSuspiciousWords.join(', ')}`);
  }
  
  // Check for excessive special characters in domain
  const specialChars = domain.replace(/[a-zA-Z0-9.-]/g, '');
  if (specialChars.length > 0) {
    score -= 15;
    warnings.push('Domain contains unusual special characters');
  }
  
  // Check for common legitimate domains
  const commonDomains = [
    'google.com', 'youtube.com', 'facebook.com', 'twitter.com', 'instagram.com', 
    'linkedin.com', 'github.com', 'apple.com', 'microsoft.com', 'amazon.com'
  ];
  
  if (commonDomains.some(d => domain.endsWith(d))) {
    score += 30; // Increased bonus from 10 to 30
    positives.push('Domain matches a common legitimate website');
    
    // Remove any warnings about suspicious words for known legitimate domains
    if (foundSuspiciousWords.length > 0) {
      const index = warnings.findIndex(w => w.includes('suspicious terms'));
      if (index !== -1) {
        warnings.splice(index, 1);
        score += 5 * foundSuspiciousWords.length; // Restore the score deduction
      }
    }
  }
  
  // Ensure score stays within 0-100 range
  score = Math.max(0, Math.min(100, score));
  
  // Add default positive if none were found
  if (positives.length === 0 && score > 50) {
    positives.push('No major security issues detected');
  }
  
  return { score, warnings, positives };
};

// Validate if input is a URL
const isValidURL = (input: string): boolean => {
  // Basic URL validation
  if (!input) return false;
  
  // Normalize URL for analysis
  let normalizedUrl = input;
  if (!input.startsWith('http://') && !input.startsWith('https://')) {
    normalizedUrl = 'https://' + input;
  }
  
  try {
    // Try to parse the URL to see if it's valid
    new URL(normalizedUrl);
    return true;
  } catch (e) {
    return false;
  }
};

// Get safety level based on score
const getSafetyLevel = (score: number) => {
  if (score >= 80) return { level: 'Safe', color: 'text-green-600', bgColor: 'bg-green-100' };
  if (score >= 50) return { level: 'Potentially Risky', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
  return { level: 'Dangerous', color: 'text-red-600', bgColor: 'bg-red-100' };
};

// URL history item type
interface HistoryItem {
  url: string;
  score: number;
  timestamp: number;
}

// Result type
interface ResultType {
  score: number;
  warnings: string[];
  positives: string[];
  aiAnalysis?: string;
  aiSafety?: {
    score: number;
    assessment: string;
  };
}

function App() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<ResultType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showPasswordKey, setShowPasswordKey] = useState(false);
  const [urlHistory, setUrlHistory] = useState<HistoryItem[]>([]);
  const [currentView, setCurrentView] = useState<'home' | 'result' | 'history'>('home');
  const [animateIn, setAnimateIn] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Load API key and history from localStorage on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('geminiApiKey');
    if (savedApiKey) {
      setGeminiApiKey(savedApiKey);
    } else {
      setShowApiKeyInput(true);
    }

    const savedHistory = localStorage.getItem('urlHistory');
    if (savedHistory) {
      try {
        setUrlHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Error parsing URL history:", e);
      }
    }
    
    // Trigger animation after component mounts
    setTimeout(() => {
      setAnimateIn(true);
    }, 100);
  }, []);

  // Save API key to localStorage
  const saveApiKey = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem('geminiApiKey', apiKeyInput);
      setGeminiApiKey(apiKeyInput);
      setShowApiKeyInput(false);
      setShowApiKeyModal(false);
    }
  };

  // Remove API key
  const removeApiKey = () => {
    localStorage.removeItem('geminiApiKey');
    setGeminiApiKey('');
    setApiKeyInput('');
    setShowApiKeyInput(true);
    setShowApiKeyModal(false);
  };

  // Add URL to history
  const addToHistory = (url: string, score: number) => {
    const newHistory = [
      { url, score, timestamp: Date.now() },
      ...urlHistory.filter(item => item.url !== url).slice(0, 19) // Keep max 20 items
    ];
    setUrlHistory(newHistory);
    localStorage.setItem('urlHistory', JSON.stringify(newHistory));
  };

  // Clear history
  const clearHistory = () => {
    setUrlHistory([]);
    localStorage.removeItem('urlHistory');
  };

  // Check URL from history
  const checkFromHistory = (historyUrl: string) => {
    setUrl(historyUrl);
    setCurrentView('home');
    handleCheck(historyUrl);
  };

  // Function to get AI analysis of the URL
  const getAIAnalysis = async (url: string) => {
    if (!geminiApiKey) return null;
    
    try {
      setAiLoading(true);
      // Create a new instance with the user-provided API key
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const prompt = `
        Analyze this URL for potential security risks: ${url}
        
        After visiting the website and analying properly, Please provide a detailed security assessment including:
        1. Is this likely to be a legitimate website or potentially malicious?
        2. Are there any red flags in the domain name or URL structure?
        3. What is the purpose of this website based on the URL?
        4. What precautions should a user take when visiting this site?
        
        Format your response in 2 simple paragraph.
        
        Additionally, on a separate line at the very end, provide a safety score from 0-100 where 100 is completely safe and 0 is definitely malicious. Format it exactly like this: "SAFETY_SCORE: [number]"
      `;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract safety score if provided
      let aiSafetyScore = 0;
      let aiText = text;
      
      const scoreMatch = text.match(/SAFETY_SCORE:\s*(\d+)/i);
      if (scoreMatch && scoreMatch[1]) {
        aiSafetyScore = parseInt(scoreMatch[1], 10);
        // Remove the safety score line from the displayed text
        aiText = text.replace(/SAFETY_SCORE:\s*\d+/i, '').trim();
      } else {
        // If no explicit score, try to infer from the content
        if (text.toLowerCase().includes('legitimate') && 
            !text.toLowerCase().includes('malicious') && 
            !text.toLowerCase().includes('suspicious')) {
          aiSafetyScore = 85;
        } else if (text.toLowerCase().includes('malicious') || 
                  text.toLowerCase().includes('phishing') || 
                  text.toLowerCase().includes('scam')) {
          aiSafetyScore = 20;
        } else if (text.toLowerCase().includes('caution') || 
                  text.toLowerCase().includes('suspicious')) {
          aiSafetyScore = 50;
        } else {
          aiSafetyScore = 65; // Default moderate score
        }
      }
      
      return {
        text: aiText,
        safety: {
          score: aiSafetyScore,
          assessment: aiSafetyScore >= 80 ? 'Safe' : 
                      aiSafetyScore >= 50 ? 'Exercise Caution' : 
                      'Potentially Unsafe'
        }
      };
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      return {
        text: "Unable to get AI analysis. Please check your API key and try again.",
        safety: null
      };
    } finally {
      setAiLoading(false);
    }
  };

  const handleCheck = async (urlToCheck = url) => {
    // Reset error state
    setUrlError(null);
    
    if (!urlToCheck.trim()) {
      setUrlError("Please enter a URL");
      return;
    }
    
    // Validate if input is a URL
    if (!isValidURL(urlToCheck)) {
      setUrlError("Please enter a valid URL (e.g., example.com or https://example.com)");
      return;
    }
    
    setIsLoading(true);
    setCurrentView('result');
    setAnimateIn(false);
    
    // Basic URL check
    const checkResult = checkURL(urlToCheck);
    
    // Get AI analysis if API key is provided
    let aiAnalysis = null;
    let aiSafety = null;
    
    if (geminiApiKey) {
      const aiResult = await getAIAnalysis(urlToCheck);
      if (aiResult) {
        aiAnalysis = aiResult.text;
        aiSafety = aiResult.safety;
        
        // If AI analysis is available and seems reliable, adjust the basic score
        if (aiSafety) {
          // Blend the scores, giving more weight to AI for known domains
          const isKnownDomain = checkResult.positives.some(p => p.includes('common legitimate website'));
          
          if (isKnownDomain) {
            // For known domains, trust AI more (70% AI, 30% basic)
            checkResult.score = Math.round(0.3 * checkResult.score + 0.7 * aiSafety.score);
          } else {
            // For unknown domains, blend equally (50% AI, 50% basic)
            checkResult.score = Math.round(0.5 * checkResult.score + 0.5 * aiSafety.score);
          }
          
          // Ensure score stays within 0-100 range
          checkResult.score = Math.max(0, Math.min(100, checkResult.score));
        }
      }
    }
    
    const finalResult = {
      ...checkResult,
      aiAnalysis: aiAnalysis || undefined,
      aiSafety: aiSafety || undefined
    };
    
    setResult(finalResult);
    addToHistory(urlToCheck, finalResult.score);
    setIsLoading(false);
    
    // Trigger animation after results are loaded
    setTimeout(() => {
      setAnimateIn(true);
    }, 100);
  };

  const resetToHome = () => {
    setAnimateIn(false);
    setTimeout(() => {
      setCurrentView('home');
      setUrl('');
      setResult(null);
      setUrlError(null);
      setTimeout(() => {
        setAnimateIn(true);
      }, 100);
    }, 300);
  };

  const navigateToHistory = () => {
    setAnimateIn(false);
    setTimeout(() => {
      setCurrentView('history');
      setTimeout(() => {
        setAnimateIn(true);
      }, 100);
    }, 300);
  };

  const safety = result ? getSafetyLevel(result.score) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-700 to-indigo-500 text-white p-6 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <button 
              onClick={resetToHome}
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <div className="relative mr-3">
                <Shield className="h-8 w-8 text-white" />
                <Zap className="h-4 w-4 text-yellow-300 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h1 className="text-2xl font-bold">SecureGuard AI</h1>
            </button>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-white bg-indigo-600 px-3 py-1 rounded-full text-sm">
              <Bot className="h-4 w-4 mr-1" />
              AI-Powered
            </div>
            <button 
              onClick={navigateToHistory}
              className="flex flex-col items-center text-white hover:text-indigo-200 transition-colors"
              title="View History"
            >
              <History className={`h-5 w-5 mb-1 ${animateIn ? 'animate-[spin_1s_ease-in-out]' : ''}`} />
              <span className="text-xs">History</span>
            </button>
            <button 
              onClick={() => setShowApiKeyModal(true)}
              className="flex flex-col items-center text-white hover:text-indigo-200 transition-colors"
              title="API Key Settings"
            >
              <Key className={`h-5 w-5 mb-1 ${animateIn ? 'animate-[bounce_1s_ease-in-out]' : ''}`} />
              <span className="text-xs">API Key</span>
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-5xl mx-auto p-6">
        {/* API Key Modal */}
        {showApiKeyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-[fadeIn_0.3s_ease-in-out]">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full animate-[scaleIn_0.3s_ease-in-out]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <Key className="h-5 w-5 mr-2 text-indigo-600" />
                  Gemini API Key Settings
                </h2>
                <button 
                  onClick={() => setShowApiKeyModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showPasswordKey ? "text" : "password"}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder={geminiApiKey ? "••••••••••••••••" : "Enter your Gemini API key"}
                    className="w-full p-3 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button 
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500"
                    onClick={() => setShowPasswordKey(!showPasswordKey)}
                  >
                    {showPasswordKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Get your API key from <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800">Google AI Studio</a>
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={saveApiKey}
                  className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Save Key
                </button>
                {geminiApiKey && (
                  <button
                    onClick={removeApiKey}
                    className="flex-1 bg-red-100 text-red-600 py-2 px-4 rounded-md hover:bg-red-200 transition-colors"
                  >
                    Remove Key
                  </button>
                )}
              </div>
              
              <p className="text-xs text-gray-500 mt-4">
                Your API key is stored locally in your browser and is never sent to our servers.
              </p>
            </div>
          </div>
        )}
        
        {/* History View */}
        {currentView === 'history' && (
          <HistoryPage 
            history={urlHistory} 
            onCheckUrl={checkFromHistory} 
            onClearHistory={clearHistory}
            onBack={resetToHome}
            animateIn={animateIn}
          />
        )}
        
        {/* Initial API Key Setup */}
        {!geminiApiKey && currentView === 'home' && (
          <div className={`bg-white rounded-lg shadow-lg p-6 mb-6 border-l-4 border-indigo-500 transition-all duration-300 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex items-start">
              <Key className="h-8 w-8 text-indigo-600 mr-4 mt-1 animate-[pulse_2s_infinite]" />
              <div>
                <h2 className="text-xl font-semibold mb-3">API Key Required</h2>
                <p className="text-gray-600 mb-4">
                  This URL Safety Checker uses Google's Gemini AI to analyze websites for potential security risks. 
                  Please enter your Gemini API key to continue.
                </p>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <input
                      type={showPasswordKey ? "text" : "password"}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="Enter your Gemini API key"
                      className="w-full p-3 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button 
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500"
                      onClick={() => setShowPasswordKey(!showPasswordKey)}
                    >
                      {showPasswordKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <button
                    onClick={saveApiKey}
                    disabled={!apiKeyInput.trim()}
                    className="bg-indigo-600 text-white py-3 px-6 rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-300"
                  >
                    Save API Key
                  </button>
                </div>
                <div className="mt-4 bg-blue-50 p-4 rounded-md">
                  <div className="flex">
                    <Bot className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-semibold text-blue-600 mb-1">AI-Powered Analysis</h5>
                      <p className="text-gray-700">
                        This tool uses Google's Gemini AI to provide in-depth analysis of URLs and detect potential security threats that basic checks might miss.
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        Get your API key from <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800">Google AI Studio</a>
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Your API key is stored locally in your browser and is never sent to our servers.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Home View - URL Input */}
        {currentView === 'home' && geminiApiKey && (
          <div className={`bg-white rounded-lg shadow-lg p-6 mb-6 transform transition-all duration-300 ease-in-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h2 className="text-2xl font-semibold mb-4 text-indigo-800">Check if a URL is safe to visit</h2>
            <div className="flex items-center mb-4 bg-indigo-50 p-3 rounded-md">
              <Bot className="h-5 w-5 text-indigo-600 mr-2" />
              <p className="text-indigo-700 text-sm">
                This tool uses Google's Gemini AI to analyze URLs for potential security risks.
              </p>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className={`w-full p-4 border ${urlError ? 'border-red-300 bg-red-50' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && url.trim()) {
                      handleCheck();
                    }
                  }}
                />
                {urlError && (
                  <p className="text-red-500 text-sm mt-1">{urlError}</p>
                )}
              </div>
              <button
                onClick={() => handleCheck()}
                disabled={isLoading || !url.trim()}
                className="bg-indigo-600 text-white py-4 px-8 rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-300 shadow-sm"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Analyzing...
                  </span>
                ) : (
                  'Check URL'
                )}
              </button>
            </div>
          </div>
        )}
        
        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-lg p-10 mb-6 flex flex-col items-center justify-center animate-[pulse_2s_infinite]">
            <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
            <h3 className="text-xl font-semibold text-indigo-800 mb-2">Analyzing URL</h3>
            <p className="text-gray-600">
              Please wait while we check the safety of this URL...
            </p>
          </div>
        )}
        
        {/* Results View */}
        {currentView === 'result' && result && !isLoading && (
          <div className={`bg-white rounded-lg shadow-lg overflow-hidden mb-6 transform transition-all duration-300 ease-in-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className={`p-6 ${safety?.bgColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {result.score >= 80 ? (
                    <CheckCircle className="h-10 w-10 text-green-600 mr-3 animate-[bounce_1s]" />
                  ) : result.score >= 50 ? (
                    <AlertTriangle className="h-10 w-10 text-yellow-600 mr-3 animate-[pulse_1s]" />
                  ) : (
                    <AlertTriangle className="h-10 w-10 text-red-600 mr-3 animate-[shake_0.5s]" />
                  )}
                  <h3 className={`text-2xl font-bold ${safety?.color}`}>
                    {safety?.level}
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold">{result.score}/100</div>
                  <div className="text-sm text-gray-600">Safety Score</div>
                </div>
              </div>
              
              {/* Action buttons at the top of results */}
              <div className="mt-4 flex flex-col md:flex-row gap-4 justify-between items-center">
                <button
                  onClick={resetToHome}
                  className="flex items-center justify-center bg-indigo-100 text-indigo-700 py-3 px-6 rounded-md hover:bg-indigo-200 transition-colors w-full md:w-auto"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Check Another URL
                </button>
                
                {result.score >= 50 && (
                  <a 
                    href={url.startsWith('http') ? url : `https://${url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center text-indigo-600 hover:text-indigo-800 py-3 px-6 border border-indigo-200 rounded-md hover:bg-indigo-50 transition-colors w-full md:w-auto"
                  >
                    Visit website <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200">
              <h4 className="font-semibold text-lg mb-2">URL Analysis</h4>
              <p className="text-gray-700 break-all mb-4 bg-gray-50 p-3 rounded-md">
                {url.startsWith('http') ? url : `https://${url}`}
                {!url.startsWith('http') && (
                  <span className="text-xs text-gray-500 ml-2">(https:// added for analysis)</span>
                )}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {result.warnings.length > 0 && (
                  <div className="bg-red-50 p-4 rounded-lg animate-[fadeIn_0.5s]">
                    <h5 className="font-semibold text-red-600 mb-2 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Warnings
                    </h5>
                    <ul className="list-disc pl-5 space-y-1">
                      {result.warnings.map((warning, index) => (
                        <li key={index} className="text-gray-700">{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {result.positives.length > 0 && (
                  <div className="bg-green-50 p-4 rounded-lg animate-[fadeIn_0.5s_0.2s]">
                    <h5 className="font-semibold text-green-600 mb-2 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Positive Indicators
                    </h5>
                    <ul className="list-disc pl-5 space-y-1">
                      {result.positives.map((positive, index) => (
                        <li key={index} className="text-gray-700">{positive}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="mt-6 border border-gray-200 rounded-lg p-4 bg-indigo-50 animate-[fadeIn_0.5s_0.4s]">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="font-semibold text-lg text-indigo-800 flex items-center">
                    <Bot className="h-5 w-5 mr-2 text-indigo-600" />
                    AI-Powered Analysis
                  </h5>
                  {result.aiSafety && (
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600 mr-2">AI Assessment:</span>
                      <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                        result.aiSafety.score >= 80 ? 'bg-green-100 text-green-800' : 
                        result.aiSafety.score >= 50 ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {result.aiSafety.assessment}
                      </span>
                    </div>
                  )}
                </div>
                
                {aiLoading ? (
                  <div className="flex items-center justify-center p-6">
                    <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                    <span className="ml-2 text-gray-600">Getting AI analysis...</span>
                  </div>
                ) : result.aiAnalysis ? (
                  <div className="prose prose-sm max-w-none bg-white p-4 rounded-md">
                    {result.aiAnalysis.split('\n\n').map((paragraph, i) => (
                      <p key={i} className="mb-3 text-gray-700">{paragraph}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 bg-white p-4 rounded-md">
                    Unable to get AI analysis. Please check your API key and try again.
                  </p>
                )}
              </div>
              
              <div className="mt-6 bg-blue-50 p-4 rounded-md animate-[fadeIn_0.5s_0.6s]">
                <div className="flex">
                  <Info className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-blue-600 mb-1">Recommendation</h5>
                    <p className="text-gray-700">
                      {result.score >= 80 
                        ? 'This URL appears to be safe, but always remain cautious when sharing personal information online.'
                        : result.score >= 50
                        ? 'Exercise caution when visiting this URL. Consider verifying its legitimacy through other sources before proceeding.'
                        : 'This URL shows multiple warning signs. We strongly recommend avoiding this website to protect your security.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <footer className="bg-gray-100 border-t border-gray-200 mt-12 py-6">
        <div className="max-w-5xl mx-auto px-6 text-center text-gray-600">
          <p className="mb-2 flex items-center justify-center">
            <Bot className="h-4 w-4 mr-1 text-indigo-600" />
            <span>This tool uses Google's Gemini AI to analyze URLs for potential security risks.</span>
          </p>
          <p className="text-sm">
            Always exercise caution when visiting unfamiliar websites and never share sensitive information unless you're certain the site is legitimate.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;