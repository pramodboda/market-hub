
import { useState, useEffect } from "react";

import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import ImageIcon from '@mui/icons-material/Image';
import WorkIcon from '@mui/icons-material/Work';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';

import { lightGreen, green, red } from '@mui/material/colors';

import { mfapi } from "../../api/axios";




// Default scheme codes for top popular Indian Mutual Funds on mfapi.in
const INITIAL_SCHEMES = [
  { code: '120716', name: 'UTI Nifty 50 Index Fund - Direct Plan - Growth', category: 'Index' },
  { code: '122639', name: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth', category: 'Flexi Cap' },
  { code: '119568', name: 'Aditya Birla Sun Life Liquid Fund - Direct Plan - GROWTH', category: 'Liquid' },
  { code: '147622', name: 'Motilal Oswal Nifty Midcap 150 Index Fund - Direct Plan - Growth', category: 'Mid Cap' },
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

  const colorClass = isPositive ? "#22c55e" : red[900]; // Emerald green vs Rose red
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




export default function WatchlistCard() {
  const [selectedSchemes, setSelectedSchemes] = useState(INITIAL_SCHEMES.slice(0, 4));
  const [suggestedScheme, setSuggestedScheme] = useState(INITIAL_SCHEMES[3]);
  const [fundDataMap, setFundDataMap] = useState({});
  const [loading, setLoading] = useState(true);

  // List states
  const [dense, setDense] = useState(true);

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

  }


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

  return (<>
    {/* <button onClick={getFundDetails(125497)}>Click Me</button> */}

    <Card sx={{ maxWidth: 360, mb: 2 }}>
      <CardContent><Typography variant="body1" sx={{ fontWeight: "bold" }}>Watchlist Widget</Typography>
        <Typography variant="caption"> Real-time data powered by mfapi.in REST API</Typography></CardContent>

      <List sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper', }} dense={dense}>

        {selectedSchemes.map((scheme) => {
          const data = fundDataMap[scheme.code];
          const isPositive = data ? data.changePct > 0 : true;

          return (<ListItem key={scheme.code}>

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: 'space-between', width: "100%", }}>

              {/* Left: Fund Name & Info */}
              <Box sx={{ width: "60%" }}>
                <ListItemText primary={data ? data.schemeName : scheme.name}></ListItemText>
              </Box>

              {/* Right: Sparkline + NAV & % Change */}
              <Box sx={{ width: "25%" }}>
                {data ? (
                  <Sparkline data={data.history} isPositive={isPositive} height={30} width={60} />
                ) : (
                  <div className="w-[60px] h-[30px] bg-zinc-800/50 rounded animate-pulse" />
                )}
              </Box>

              {/* Financial Figures */}
              <Box sx={{ width: "15%", textAlign: "right", lineHeight: "0rem" }}>

                {data ? (<Box><Typography variant="body2" sx={{ color: isPositive ? "#22c55e" : "black", fontWeight: "bold" }}>{isPositive ? "+" : ''}{data.changePct.toFixed(2)}%</Typography> <Typography variant="caption">₹{data.latestNAV.toFixed(2)}</Typography></Box>) : ""}
              </Box>


            </Box >


          </ListItem>)
        })}
      </List >
    </Card>


    {/* Explanatory Banner below Widget */}
    <Card sx={{ maxWidth: 360 }}>
      {/* <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" /> */}
      <CardContent>
        <Typography variant="body2">How percent change is calculated:</Typography>
        <code>
          Change % = ((Latest NAV - Previous NAV) / Previous NAV) * 100
        </code>
        <Typography variant="body2">
          Calculated automatically from the latest 2 historical NAV data points returned by mfapi.in.
        </Typography>
      </CardContent>
    </Card>
  </>

  );
}
