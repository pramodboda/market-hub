
import { useState, useEffect } from "react";

import Stack from '@mui/material/Stack';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import ImageIcon from '@mui/icons-material/Image';
import WorkIcon from '@mui/icons-material/Work';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';

import { mfapi } from "../../api/axios";




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





export default function WatchlistCard() {
  const [selectedSchemes, setSelectedSchemes] = useState(INITIAL_SCHEMES.slice(0, 3));
  const [suggestedScheme, setSuggestedScheme] = useState(INITIAL_SCHEMES[3]);
  const [fundDataMap, setFundDataMap] = useState({});
  const [loading, setLoading] = useState(true);

  const [dense, setDense] = useState(false);

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
    <List sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }} dense={dense}>

      {selectedSchemes.map((scheme) => {
        const data = fundDataMap[scheme.code];
        const isPositive = data ? data.changePct > 0 : true;

        return (<ListItem key={scheme.code}>

          <Stack>
            {/* Left: Fund Name & Info */}
            <ListItemText primary={data ? data.schemeName : scheme.name}></ListItemText>
            {/* Financial Figures */}
            {data ? (<><div>{isPositive ? "+" : ''}{data.changePct.toFixed(2)}%</div> <div>   ₹{data.latestNAV.toFixed(2)}</div></>) : ""}

          </Stack>


        </ListItem>)
      })}

      <ListItem>

        <Stack sx={{
          flexDirection: "row", alignItems: "center", justifyContent: "space-between"
        }}>
          <ListItemText primary="dfkjghdlkfgh"></ListItemText>
          {/* Financial Figures */}
          +876%
        </Stack>


      </ListItem >
      <ListItem>
        <ListItemAvatar>
          <Avatar>
            <ImageIcon />
          </Avatar>
        </ListItemAvatar>
        <ListItemText primary="Photos" secondary="Jan 9, 2014" />
      </ListItem>
      <ListItem>
        <ListItemAvatar>
          <Avatar>
            <WorkIcon />
          </Avatar>
        </ListItemAvatar>
        <ListItemText primary="Work" secondary="Jan 7, 2014" />
      </ListItem>
      <ListItem>
        <ListItemAvatar>
          <Avatar>
            <BeachAccessIcon />
          </Avatar>
        </ListItemAvatar>
        <ListItemText primary="Vacation" secondary="July 20, 2014" />
      </ListItem>
    </List >
  </>

  );
}
