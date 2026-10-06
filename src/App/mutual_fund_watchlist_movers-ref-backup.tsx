import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  X, 
  Search, 
  RefreshCw, 
  ChevronRight, 
  Info, 
  Code, 
  Sparkles, 
  Check, 
  Trash2,
  ExternalLink,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

// Default scheme codes for top popular Indian Mutual Funds on mfapi.in
const INITIAL_SCHEMES = [
  { code: '120716', name: 'UTI Nifty 50 Index Fund Direct Growth', category: 'Index' },
  { code: '122639', name: 'Parag Parikh Flexi Cap Fund Direct Growth', category: 'Flexi Cap' },
  { code: '100033', name: 'Aditya Birla Sun Life Frontline Equity Fund Direct Growth', category: 'Large Cap' },
  { code: '118989', name: 'Mirae Asset Large Cap Fund Direct Growth', category: 'Large Cap' },
  { code: '125497', name: 'SBI Small Cap Fund Direct Growth', category: 'Small Cap' }
];

// Fallback historical data in case of CORS or network error with mfapi.in
const FALLBACK_HISTORICAL_DATA = {
  '120716': [
    { date: '01-10-2024', nav: '156.20' },
    { date: '02-10-2024', nav: '157.10' },
    { date: '03-10-2024', nav: '156.80' },
    { date: '04-10-2024', nav: '157.90' },
    { date: '05-10-2024', nav: '158.20' },
    { date: '06-10-2024', nav: '158.83' }
  ],
  '122639': [
    { date: '01-10-2024', nav: '87.20' },
    { date: '02-10-2024', nav: '87.50' },
    { date: '03-10-2024', nav: '88.10' },
    { date: '04-10-2024', nav: '88.00' },
    { date: '05-10-2024', nav: '88.26' },
    { date: '06-10-2024', nav: '88.76' }
  ],
  '100033': [
    { date: '01-10-2024', nav: '21.80' },
    { date: '02-10-2024', nav: '21.95' },
    { date: '03-10-2024', nav: '22.00' },
    { date: '04-10-2024', nav: '21.90' },
    { date: '05-10-2024', nav: '22.04' },
    { date: '06-10-2024', nav: '22.15' }
  ]
};

/**
 * Renders a compact, smooth SVG sparkline with gradient fill
 */
const Sparkline = ({ data, isPositive, height = 36, width = 72 }) => {
  if (!data || data.length < 2) return <div className="w-[72px] h-[36px]" />;

  const navValues = data.map(d => parseFloat(d.nav)).filter(v => !isNaN(v));
  if (navValues.length < 2) return null;

  const min = Math.min(...navValues);
  const max = Math.max(...navValues);
  const range = max - min === 0 ? 1 : max - min;

  // Normalize points to SVG coordinates
  const points = navValues.map((val, idx) => {
    const x = (idx / (navValues.length - 1)) * width;
    // Map NAV high to y=2 and low to y=height-2 (inverted Y axis in SVG)
    const y = height - 4 - ((val - min) / range) * (height - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  const colorClass = isPositive ? '#22c55e' : '#ef4444'; // Emerald green vs Rose red
  const gradientId = `sparkline-grad-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colorClass} stopOpacity="0.35" />
          <stop offset="100%" stopColor={colorClass} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      {/* Filled Area */}
      <path d={areaD} fill={`url(#${gradientId})`} />
      {/* Line path */}
      <path
        d={pathD}
        fill="none"
        stroke={colorClass}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Latest value dot */}
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].split(',')[0]}
          cy={points[points.length - 1].split(',')[1]}
          r="2.5"
          fill={colorClass}
        />
      )}
    </svg>
  );
};

export default function App() {
  const [selectedSchemes, setSelectedSchemes] = useState(INITIAL_SCHEMES.slice(0, 3));
  const [suggestedScheme, setSuggestedScheme] = useState(INITIAL_SCHEMES[3]);
  const [fundDataMap, setFundDataMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('watchlist'); // 'watchlist', 'search', 'docs'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [timeframe, setTimeframe] = useState('1D'); // 1D, 1M, 1Y
  const [activeWalkthrough, setActiveWalkthrough] = useState(false);

  // Fetch mutual fund NAV details from API
  const fetchFundDetails = async (schemeCode) => {
    try {
      const response = await fetch(`https://api.mfapi.in/mf/${schemeCode}`);
      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();
      
      if (data && data.data && data.data.length > 0) {
        // Data comes in reverse chronological order (newest first)
        const history = data.data.slice(0, 30).reverse(); // Get last 30 data points in chronological order
        const latestNAV = parseFloat(history[history.length - 1]?.nav || 0);
        const previousNAV = parseFloat(history[history.length - 2]?.nav || latestNAV);
        
        const changeVal = latestNAV - previousNAV;
        const changePct = previousNAV !== 0 ? (changeVal / previousNAV) * 100 : 0;

        return {
          schemeCode,
          schemeName: data.meta?.scheme_name || `Scheme ${schemeCode}`,
          category: data.meta?.scheme_category || 'Equity',
          fundHouse: data.meta?.fund_house || 'Mutual Fund',
          latestNAV,
          changeVal,
          changePct,
          history,
          isMock: false
        };
      }
    } catch (err) {
      console.warn(`Using fallback data for fund ${schemeCode}:`, err);
    }

    // Fallback logic
    const history = FALLBACK_HISTORICAL_DATA[schemeCode] || FALLBACK_HISTORICAL_DATA['120716'];
    const latestNAV = parseFloat(history[history.length - 1].nav);
    const previousNAV = parseFloat(history[history.length - 2].nav);
    const changeVal = latestNAV - previousNAV;
    const changePct = (changeVal / previousNAV) * 100;

    return {
      schemeCode,
      schemeName: INITIAL_SCHEMES.find(s => s.code === schemeCode)?.name || `Scheme ${schemeCode}`,
      category: 'Equity',
      fundHouse: 'Mutual Fund',
      latestNAV,
      changeVal,
      changePct,
      history,
      isMock: true
    };
  };

  const loadAllFunds = async () => {
    setLoading(true);
    const allCodes = Array.from(new Set([
      ...selectedSchemes.map(s => s.code),
      suggestedScheme.code
    ]));

    const results = await Promise.all(allCodes.map(code => fetchFundDetails(code)));
    const map = {};
    results.forEach(res => {
      if (res) map[res.schemeCode] = res;
    });

    setFundDataMap(map);
    setLoading(false);
  };

  useEffect(() => {
    loadAllFunds();
  }, []);

  // Handle Search using mfapi.in search endpoint
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data.slice(0, 8)); // Top 8 results
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addSchemeToWatchlist = async (scheme) => {
    const code = scheme.schemeCode.toString();
    if (!selectedSchemes.some(s => s.code === code)) {
      const newSchemeObj = {
        code,
        name: scheme.schemeName,
        category: 'Mutual Fund'
      };
      setSelectedSchemes([...selectedSchemes, newSchemeObj]);
      if (!fundDataMap[code]) {
        const details = await fetchFundDetails(code);
        setFundDataMap(prev => ({ ...prev, [code]: details }));
      }
    }
    setActiveTab('watchlist');
  };

  const removeSchemeFromWatchlist = (code) => {
    setSelectedSchemes(selectedSchemes.filter(s => s.code !== code));
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-100 flex flex-col justify-between font-sans antialiased selection:bg-emerald-500 selection:text-black p-4 sm:p-6 lg:p-10">
      
      {/* Header Bar */}
      <header className="max-w-4xl mx-auto w-full mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white">Mutual Fund Watchlist Widget</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time data powered by <code className="text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded font-mono">mfapi.in</code> REST API
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800/80 text-xs font-medium">
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'watchlist'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Watchlist Card
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'search'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Add Funds
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'docs'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Integration Code
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto w-full flex-1 flex flex-col items-center justify-start">
        
        {/* VIEW 1: WATCHLIST CARD (Matches Screenshot Pixel-For-Pixel Aesthetic) */}
        {activeTab === 'watchlist' && (
          <div className="w-full max-w-md space-y-6 animate-fade-in">
            
            {/* The Main Dark-Mode Watchlist Movers Container */}
            <div className="bg-[#1c1e22] border border-zinc-800/80 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
              
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <TrendingUp className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <h2 className="text-lg font-bold text-white tracking-wide">Watchlist movers</h2>
                </div>
                <button 
                  onClick={loadAllFunds}
                  className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-800/60 transition-colors"
                  title="Refresh NAVs"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
              </div>

              {/* Watchlist Item Rows */}
              <div className="space-y-2.5">
                {selectedSchemes.map((scheme) => {
                  const data = fundDataMap[scheme.code];
                  const isPositive = data ? data.changePct >= 0 : true;

                  return (
                    <div
                      key={scheme.code}
                      className="group relative bg-[#24272d] hover:bg-[#2c3037] border border-zinc-800/60 rounded-xl p-3.5 transition-all duration-200 flex items-center justify-between cursor-pointer"
                    >
                      {/* Left: Fund Name & Info */}
                      <div className="pr-2 max-w-[55%]">
                        <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors truncate">
                          {data ? data.schemeName : scheme.name}
                        </h3>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                          <span className="font-mono text-zinc-500">#{scheme.code}</span>
                          {data?.isMock && (
                            <span className="bg-amber-500/10 text-amber-400 text-[9px] px-1.5 py-0.2 rounded border border-amber-500/20">
                              Simulated
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Sparkline + NAV & % Change */}
                      <div className="flex items-center gap-3">
                        {/* Mini SVG Sparkline Chart */}
                        <div className="hidden sm:block opacity-90 group-hover:opacity-100 transition-opacity">
                          {data ? (
                            <Sparkline data={data.history} isPositive={isPositive} />
                          ) : (
                            <div className="w-[72px] h-[36px] bg-zinc-800/50 rounded animate-pulse" />
                          )}
                        </div>

                        {/* Financial Figures */}
                        <div className="text-right min-w-[70px]">
                          {data ? (
                            <>
                              <div
                                className={`text-xs font-bold flex items-center justify-end gap-0.5 ${
                                  isPositive ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {isPositive ? '+' : ''}
                                {data.changePct.toFixed(2)}%
                              </div>
                              <div className="text-xs font-medium text-zinc-300 font-mono mt-0.5">
                                ₹{data.latestNAV.toFixed(2)}
                              </div>
                            </>
                          ) : (
                            <div className="space-y-1">
                              <div className="w-12 h-3.5 bg-zinc-800 rounded animate-pulse ml-auto" />
                              <div className="w-10 h-3 bg-zinc-800 rounded animate-pulse ml-auto" />
                            </div>
                          )}
                        </div>

                        {/* Remove Action Button on hover */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSchemeFromWatchlist(scheme.code);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-500 hover:text-rose-400 rounded-md hover:bg-zinc-800"
                          title="Remove from list"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Suggested For You Section */}
              <div className="mt-6 pt-4 border-t border-zinc-800/60">
                <span className="text-xs font-medium text-zinc-400 block mb-2.5">
                  Suggested for you
                </span>

                {(() => {
                  const data = fundDataMap[suggestedScheme.code];
                  const isPositive = data ? data.changePct >= 0 : true;

                  return (
                    <div className="bg-[#24272d] border border-zinc-800/60 rounded-xl p-3.5 flex items-center justify-between">
                      <div className="pr-2 max-w-[50%]">
                        <h4 className="text-xs font-semibold text-zinc-200 truncate">
                          {data ? data.schemeName : suggestedScheme.name}
                        </h4>
                        <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">
                          {suggestedScheme.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="opacity-90">
                          {data ? (
                            <Sparkline data={data.history} isPositive={isPositive} height={30} width={60} />
                          ) : (
                            <div className="w-[60px] h-[30px] bg-zinc-800/50 rounded animate-pulse" />
                          )}
                        </div>

                        <div className="text-right">
                          {data ? (
                            <>
                              <div className={`text-xs font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isPositive ? '+' : ''}{data.changePct.toFixed(2)}%
                              </div>
                              <div className="text-xs font-medium text-zinc-300 font-mono mt-0.5">
                                ₹{data.latestNAV.toFixed(2)}
                              </div>
                            </>
                          ) : (
                            <div className="w-12 h-3 bg-zinc-800 rounded animate-pulse" />
                          )}
                        </div>

                        <button
                          onClick={() => addSchemeToWatchlist({
                            schemeCode: suggestedScheme.code,
                            schemeName: suggestedScheme.name
                          })}
                          className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-emerald-500/20 hover:text-emerald-400 border border-zinc-700/60 flex items-center justify-center text-zinc-300 transition-colors"
                          title="Add to Watchlist"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Bottom Pagination / Action Footer */}
              <div className="mt-5 flex items-center justify-between pt-2">
                {/* Carousel Dots */}
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-zinc-300" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                </div>

                <button 
                  onClick={() => setActiveTab('search')}
                  className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
                >
                  See watchlist movers
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Explanatory Banner below Widget */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex items-start gap-3 text-xs text-zinc-400">
              <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-zinc-300 mb-1">How percent change is calculated:</p>
                <code className="text-emerald-400 font-mono text-[11px] block bg-zinc-950 p-1.5 rounded mb-1">
                  Change % = ((Latest NAV - Previous NAV) / Previous NAV) * 100
                </code>
                <p className="text-zinc-500">
                  Calculated automatically from the latest 2 historical NAV data points returned by mfapi.in.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: SEARCH & ADD FUNDS */}
        {activeTab === 'search' && (
          <div className="w-full max-w-xl space-y-5 animate-fade-in">
            <div className="bg-[#1c1e22] border border-zinc-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-2">Search Funds on mfapi.in</h2>
              <p className="text-xs text-zinc-400 mb-5">
                Type any Indian Mutual Fund name (e.g., "Parag Parikh", "Axis Bluechip", "Tata Digital")
              </p>

              <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search mutual fund scheme name..."
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2"
                >
                  {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Search'}
                </button>
              </form>

              {/* Search Results */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {searchResults.length > 0 ? (
                  searchResults.map((result) => {
                    const isAdded = selectedSchemes.some(s => s.code === result.schemeCode.toString());
                    return (
                      <div
                        key={result.schemeCode}
                        className="flex items-center justify-between p-3 bg-zinc-900/60 border border-zinc-800/60 rounded-xl hover:border-zinc-700 transition-colors"
                      >
                        <div className="max-w-[80%]">
                          <div className="text-xs font-semibold text-zinc-200 truncate">
                            {result.schemeName}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            Code: {result.schemeCode}
                          </div>
                        </div>

                        <button
                          onClick={() => addSchemeToWatchlist(result)}
                          disabled={isAdded}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                            isAdded
                              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Added
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" /> Watch
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })
                ) : searchQuery && !isSearching ? (
                  <p className="text-center text-xs text-zinc-500 py-6">No mutual funds found matching "{searchQuery}"</p>
                ) : (
                  <div className="text-center text-xs text-zinc-500 py-6">
                    Start typing to query over 10,000+ mutual fund schemes from mfapi.in
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: INTEGRATION CODE & EXPLANATION */}
        {activeTab === 'docs' && (
          <div className="w-full max-w-2xl space-y-6 animate-fade-in text-left">
            
            {/* Steps & Integration Guide */}
            <div className="bg-[#1c1e22] border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">How mfapi.in integration works</h2>
              </div>

              <div className="space-y-4 text-xs text-zinc-300">
                <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 space-y-1">
                  <div className="font-semibold text-emerald-400 font-mono">1. API Endpoint Format</div>
                  <p className="text-zinc-400">
                    Fetch full scheme NAV history using Scheme Code:
                  </p>
                  <code className="block bg-zinc-950 p-2 rounded text-[11px] text-sky-300 font-mono overflow-x-auto">
                    GET https://api.mfapi.in/mf/120716
                  </code>
                </div>

                <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 space-y-1">
                  <div className="font-semibold text-emerald-400 font-mono">2. Calculate NAV Percentage Change</div>
                  <p className="text-zinc-400">
                    The API returns an array of dates & NAV values with newest items first (`data[0]`):
                  </p>
                  <pre className="bg-zinc-950 p-2.5 rounded text-[11px] text-zinc-300 font-mono overflow-x-auto">
{`const latestNAV = parseFloat(data.data[0].nav);
const prevNAV = parseFloat(data.data[1].nav);

const changePct = ((latestNAV - prevNAV) / prevNAV) * 100;`}
                  </pre>
                </div>

                <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 space-y-1">
                  <div className="font-semibold text-emerald-400 font-mono">3. Render SVG Sparkline Component</div>
                  <p className="text-zinc-400">
                    Map historical NAV points into a 2D SVG path dynamically without heavy chart libraries:
                  </p>
                  <pre className="bg-zinc-950 p-2.5 rounded text-[11px] text-zinc-300 font-mono overflow-x-auto">
{`const points = history.map((val, idx) => {
  const x = (idx / (history.length - 1)) * width;
  const y = height - ((val - min) / range) * height;
  return \`\${x},\${y}\`;
});
const pathD = \`M \${points.join(' L ')}\`;`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Code Snippet Box */}
            <div className="bg-[#1c1e22] border border-zinc-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                Sample React Component Code
              </h3>
              <pre className="bg-zinc-950 p-4 rounded-xl text-[11px] text-zinc-300 font-mono overflow-x-auto border border-zinc-800/80 leading-relaxed">
{`import React, { useEffect, useState } from 'react';

export function FundMoversCard({ schemeCode }) {
  const [fund, setFund] = useState(null);

  useEffect(() => {
    fetch(\`https://api.mfapi.in/mf/\${schemeCode}\`)
      .then(res => res.json())
      .then(data => {
        const latest = parseFloat(data.data[0].nav);
        const prev = parseFloat(data.data[1].nav);
        const pct = ((latest - prev) / prev) * 100;
        
        setFund({
          name: data.meta.scheme_name,
          nav: latest,
          changePct: pct,
          history: data.data.slice(0, 10).reverse()
        });
      });
  }, [schemeCode]);

  if (!fund) return <div>Loading...</div>;

  return (
    <div className="bg-[#24272d] text-white p-3 rounded-xl flex justify-between">
      <div>
        <h4 className="text-sm font-semibold">{fund.name}</h4>
      </div>
      <div className="text-right">
        <span className={fund.changePct >= 0 ? 'text-green-400' : 'text-red-400'}>
          {fund.changePct.toFixed(2)}%
        </span>
        <p>₹{fund.nav}</p>
      </div>
    </div>
  );
}`}
              </pre>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full border-t border-zinc-800/80 pt-4 mt-8 text-center text-xs text-zinc-500">
        Mutual Fund Watchlist Widget • Styled for dark mode • Live data powered by <a href="https://www.mfapi.in" target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">mfapi.in</a>
      </footer>
    </div>
  );
}