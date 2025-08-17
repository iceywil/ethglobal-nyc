export interface CustomWallet {
  id: string;
  name: string;
  tokens: { [currency: string]: number };
}
