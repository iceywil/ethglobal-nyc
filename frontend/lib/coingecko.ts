import axios from 'axios';

const API_BASE_URL = 'https://api.coingecko.com/api/v3';

export interface PriceDataPoint {
  time: string;
  value: number;
}

export type TimeInterval = '1m' | '5m' | '15m' | '1h' | '2h' | '1d' | '1w' | '1M' | '1y' | '5y';

export interface TokenMarketData {
  id: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
}

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
