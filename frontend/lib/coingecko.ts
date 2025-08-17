import axios from 'axios';

const API_BASE_URL = 'https://api.coingecko.com/api/v3';

export interface PriceDataPoint {
  time: string;
  value: number;
}

export type TimeInterval = '1m' | '5m' | '15m' | '1h' | '2h' | '1d' | '1w' | '1M' | '1y' | '5y';

export const getHistoricalCoinData = async (coinId: string): Promise<[number, number][]> => {
  try {
    const to = Math.floor(Date.now() / 1000);
    const from = to - 24 * 60 * 60; // 24 hours ago

    const response = await axios.get(`${API_BASE_URL}/coins/${coinId}/market_chart/range`, {
      params: {
        vs_currency: 'usd',
        from: from,
        to: to,
        x_cg_demo_api_key: process.env.NEXT_PUBLIC_COINGECKO_API_KEY,
      },
    });

    if (response.data && response.data.prices) {
      console.log(`Successfully fetched historical data for ${coinId}`);
      return response.data.prices;
    }

    return [];
  } catch (error) {
    console.error(`Error fetching historical data for ${coinId}:`, error);
    return [];
  }
};

export interface TokenMarketData {
  id: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
}

export const getTokensMarketData = async (contractAddresses: string[]): Promise<{[key: string]: { usd: number, usd_24h_change: number }}> => {
  if (contractAddresses.length === 0) {
    return {};
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/simple/token_price/ethereum`, {
      params: {
        contract_addresses: contractAddresses.join(','),
        vs_currencies: 'usd',
        include_24hr_change: true,
        x_cg_demo_api_key: process.env.NEXT_PUBLIC_COINGECKO_API_KEY,
      },
    });

    console.log('Successfully fetched token market data by contract addresses.');
    return response.data;
  } catch (error) {
    console.error('Error fetching token market data by contract addresses:', error);
    return {};
  }
};

export const getCoinsMarketData = async (ids: string[]): Promise<TokenMarketData[]> => {
  if (ids.length === 0) {
    return [];
  }
  try {
    const response = await axios.get(`${API_BASE_URL}/coins/markets`, {
      params: {
        vs_currency: 'usd',
        ids: ids.join(','),
        x_cg_demo_api_key: process.env.NEXT_PUBLIC_COINGECKO_API_KEY,
      },
    });
    console.log('Successfully fetched coins market data.');
    return response.data;
  } catch (error) {
    console.error('Error fetching coins market data:', error);
    return [];
  }
};

// This function is kept for now but may be deprecated if not used elsewhere.
export const getAllCoinsMarketData = async (): Promise<TokenMarketData[]> => {
  let allMarketData: TokenMarketData[] = [];
  try {
    // Fetch top 500 coins by market cap in two pages
    for (let page = 1; page <= 2; page++) {
      const response = await axios.get(`${API_BASE_URL}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 250,
          page: page,
          sparkline: false,
          x_cg_demo_api_key: process.env.NEXT_PUBLIC_COINGECKO_API_KEY,
        },
      });
      allMarketData = allMarketData.concat(response.data);
    }
    console.log('Successfully fetched all coins market data.');
    return allMarketData;
  } catch (error) {
    console.error('Error fetching all coins market data:', error);
    return [];
  }
};
