import axios from 'axios';

export interface Nft {
  identifier: string;
  collection: string;
  contract: string;
  token_standard: string;
  name: string;
  description: string;
  image_url: string;
  metadata_url: string;
  opensea_url: string;
  updated_at: string;
  is_disabled: boolean;
  is_nsfw: boolean;
}

const API_BASE_URL = 'https://api.opensea.io/api/v2';

export const getNfts = async (chain: string, address: string): Promise<Nft[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/chain/${chain}/account/${address}/nfts`, {
      headers: {
        'X-API-KEY': process.env.NEXT_PUBLIC_OPEN_SEA_API_KEY || '',
      },
    });

    if (response.data && response.data.nfts) {
      return response.data.nfts;
    }

    return [];
  } catch (error) {
    console.error('Error fetching NFTs from OpenSea:', error);
    return [];
  }
};
