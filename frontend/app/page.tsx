"use client"
import { BarChart3, Search, Bell, Settings, User, TrendingUp, ChevronDown, ChevronRight, ArrowRightLeft, ArrowUpRight, ArrowDownLeft, Zap, CircleUserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { useRequestAccount, useAccounts, useCurrencies } from "@ledgerhq/wallet-api-client-react"
import { Account, CryptoCurrency } from "@ledgerhq/wallet-api-client"
import WalletModal from "@/components/modals/wallet-modal"
import BigNumber from "bignumber.js"
import { TimeInterval, PriceDataPoint, getCoinsMarketData, getTokensMarketData, getHistoricalCoinData, TokenMarketData } from "@/lib/coingecko"
import { CustomWallet } from "@/lib/types"
import { getNfts, Nft } from "@/lib/opensea-service"
import SkeletonLoader from "@/components/ui/skeleton-loader"
import dynamic from 'next/dynamic'
import SimpleAreaChart from "@/components/ui/simple-area-chart"

const TradingChart = dynamic(() => import('@/components/ui/simple-area-chart'), {
  ssr: false,
  loading: () => <SkeletonLoader className="h-full w-full" />,
});

type TokenCurrency = {
  type: 'TokenCurrency';
  id: string;
  standard: 'ERC20';
  contract: string;
  name: string;
  color: string;
  ticker: string;
  decimals: number;
  parent: string;
};

interface AggregatedToken {
  id: string;
  name: string;
  ticker: string;
  color: string;
  amount: number;
  usdValue: number;
  change24h: number;
}

interface Wallet {
  id: string;
  name: string;
  totalUsdValue: number;
  tokens: (AggregatedToken & { accountName: string })[];
}

// Mock data matching the reference design - This will be replaced by real data
const initialPortfolioStats = {
  totalBalance: 0,
  totalProfit: 0,
  profitPercentage: 0,
}

const sidebarItems = [
  { icon: BarChart3, label: "Dashboard", active: true },
  { icon: TrendingUp, label: "Trade", active: false },
  { icon: Settings, label: "Deposits", active: false },
  { icon: Settings, label: "Protocols", active: false },
  { icon: Settings, label: "Settings", active: false },
  { icon: User, label: "Profile", active: false },
]

export default function CryptoDashboard() {
  const [expandedWallets, setExpandedWallets] = useState<string[]>([])
  const { requestAccount, account } = useRequestAccount()
  const { accounts: walletApiAccounts, loading: loadingAccounts, error: accountsError } = useAccounts()
  const { currencies } = useCurrencies()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [customWallets, setCustomWallets] = useState<CustomWallet[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [timeInterval, setTimeInterval] = useState<TimeInterval>("1M")
  const [chartData, setChartData] = useState<PriceDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [portfolioStats, setPortfolioStats] = useState(initialPortfolioStats)
  const [aggregatedTokens, setAggregatedTokens] = useState<AggregatedToken[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [nfts, setNfts] = useState<Nft[]>([])

  useEffect(() => {
    const storedAccounts = localStorage.getItem("wallet-accounts")
    if (storedAccounts) {
      setAccounts(JSON.parse(storedAccounts));
    }
    const storedCustomWallets = localStorage.getItem("custom-wallets");
    if (storedCustomWallets) {
      setCustomWallets(JSON.parse(storedCustomWallets));
    }
    if (!storedAccounts && !storedCustomWallets) {
      setIsModalOpen(true);
    }
  }, []);

  useEffect(() => {
    if (accounts.length > 0) {
      localStorage.setItem("wallet-accounts", JSON.stringify(accounts));
    } else {
      localStorage.removeItem("wallet-accounts");
    }
    if (customWallets.length > 0) {
      localStorage.setItem("custom-wallets", JSON.stringify(customWallets));
    } else {
      localStorage.removeItem("custom-wallets");
    }
  }, [accounts, customWallets]);
  
  useEffect(() => {
    const fetchAndProcessData = async () => {
      if (walletApiAccounts && walletApiAccounts.length > 0 && currencies && currencies.length > 0) {
        setIsLoading(true);

        const accountsWithCurrency = walletApiAccounts.map(acc => ({
          ...acc,
          currencyInfo: currencies.find(c => c.id === acc.currency)
        })).filter((acc): acc is Account & { currencyInfo: CryptoCurrency | TokenCurrency } => Boolean(acc.currencyInfo));

        const tokenAccounts = accountsWithCurrency.filter(acc => acc.currencyInfo.type === 'TokenCurrency');
        const nativeCoinAccounts = accountsWithCurrency.filter(acc => acc.currencyInfo.type === 'CryptoCurrency');

        const contractAddresses = [...new Set(tokenAccounts.map(acc => (acc.currencyInfo as TokenCurrency).contract))];
        const coinIds = [...new Set(nativeCoinAccounts.map(acc => acc.currencyInfo.id))];

        const [tokensMarketData, coinsMarketData] = await Promise.all([
          getTokensMarketData(contractAddresses),
          getCoinsMarketData(coinIds),
        ]);

        const processedAccounts = accountsWithCurrency.map(account => {
          const { currencyInfo, balance } = account;
          const { decimals } = currencyInfo;
          const amount = parseFloat(balance.shiftedBy(-decimals).toString());
          
          let usdValue = 0;
          let change24h = 0;

          if (currencyInfo.type === 'TokenCurrency') {
            const marketInfo = tokensMarketData[currencyInfo.contract.toLowerCase()];
            if (marketInfo) {
              usdValue = amount * marketInfo.usd;
              change24h = marketInfo.usd_24h_change;
            }
          } else { // CryptoCurrency
            const marketInfo = coinsMarketData.find(m => m.id === currencyInfo.id);
            if (marketInfo) {
              usdValue = amount * marketInfo.current_price;
              change24h = marketInfo.price_change_percentage_24h;
            }
          }

          return { ...account, amount, usdValue, change24h };
        });
        
        const walletsMap = new Map<string, Wallet>();

        processedAccounts.forEach(account => {
          const parentAccount = account.parentAccountId 
            ? accountsWithCurrency.find(a => a.id === account.parentAccountId) 
            : account;
          
          const walletId = parentAccount ? parentAccount.id : account.id;
          const walletName = parentAccount ? parentAccount.name : account.name;

          if (!walletsMap.has(walletId)) {
            walletsMap.set(walletId, {
              id: walletId,
              name: walletName,
              totalUsdValue: 0,
              tokens: [],
            });
          }

          const wallet = walletsMap.get(walletId)!;
          wallet.totalUsdValue += account.usdValue;
          wallet.tokens.push({
            id: account.id,
            name: account.currencyInfo.name,
            ticker: account.currencyInfo.ticker,
            color: account.currencyInfo.color,
            amount: account.amount,
            usdValue: account.usdValue,
            change24h: account.change24h,
            accountName: account.name,
          });
        });

        const finalWallets = Array.from(walletsMap.values())
          .sort((a, b) => b.totalUsdValue - a.totalUsdValue);
        
        setWallets(finalWallets);

        const aggregationMap = new Map<string, AggregatedToken>();

        processedAccounts.forEach(account => {
          const { currencyInfo, amount, usdValue, change24h, name } = account;
          const existing = aggregationMap.get(currencyInfo.id);
          if (existing) {
            existing.amount += amount;
            existing.usdValue += usdValue;
            existing.accounts.push({ name, amount, usdValue });
          } else {
            aggregationMap.set(currencyInfo.id, {
              id: currencyInfo.id,
              name: currencyInfo.name,
              ticker: currencyInfo.ticker,
              color: currencyInfo.color,
              amount: amount,
              usdValue: usdValue,
              change24h: (Math.random() * 10 - 5), // Random change between -5% and +5%
              accounts: [{ name, amount, usdValue }],
            });
          }
        });

        const finalAggregatedTokens = Array.from(aggregationMap.values())
          .sort((a, b) => b.usdValue - a.usdValue);

        setAggregatedTokens(finalAggregatedTokens);

        const totalValue = finalAggregatedTokens.reduce((acc, current) => acc + current.usdValue, 0);
        
        // Charting logic using historical data for native coins
        const nativeCoinsForChart = nativeCoinAccounts.map(account => {
          const { currencyInfo, balance } = account;
          const { decimals } = currencyInfo;
          const amount = parseFloat(balance.shiftedBy(-decimals).toString());
          return { id: currencyInfo.id, amount };
        });

        const historicalDataPromises = nativeCoinsForChart.map(coin => getHistoricalCoinData(coin.id));
        const historicalDataResults = await Promise.all(historicalDataPromises);

        const portfolioHistory: { [timestamp: number]: number } = {};

        historicalDataResults.forEach((coinHistory, index) => {
          const coin = nativeCoinsForChart[index];
          coinHistory.forEach(([timestamp, price]) => {
            const hourlyTimestamp = Math.floor(timestamp / (1000 * 60 * 60)) * (1000 * 60 * 60);
            if (!portfolioHistory[hourlyTimestamp]) {
              portfolioHistory[hourlyTimestamp] = 0;
            }
            portfolioHistory[hourlyTimestamp] += coin.amount * price;
          });
        });

        const aggregatedChartData: PriceDataPoint[] = Object.entries(portfolioHistory)
          .map(([timestamp, value]) => ({
            time: new Date(parseInt(timestamp)).toISOString(),
            value: value,
            }))
            .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

          setChartData(aggregatedChartData);

        if (aggregatedChartData.length > 0) {
          const initialValue = aggregatedChartData[0].value;
          const totalProfit = totalValue - initialValue;
          const profitPercentage = initialValue > 0 ? (totalProfit / initialValue) * 100 : 0;
          
          setPortfolioStats({
            totalBalance: totalValue,
            totalProfit,
            profitPercentage,
          });
        } else {
          setPortfolioStats({
            totalBalance: totalValue,
            totalProfit: 0,
            profitPercentage: 0,
          });
        }

        setIsLoading(false);
      }
    };
    fetchAndProcessData();
  }, [walletApiAccounts, currencies]);

  useEffect(() => {
    const fetchNfts = async () => {
      const ethAccount = walletApiAccounts?.find(a => a.currency === 'ethereum');
      if (ethAccount) {
        const fetchedNfts = await getNfts('ethereum', ethAccount.address);
      setNfts(fetchedNfts);
      }
    }
    fetchNfts();
  }, [walletApiAccounts]);

  useEffect(() => {
    if (account && !accounts.find(acc => acc.address === account.address)) {
      setAccounts(prevAccounts => [...prevAccounts, account]);
    }
  }, [account, accounts]);

  const handleConnect = () => {
    requestAccount({
      currencyIds: ["ethereum", "polygon", "bsc", "bitcoin", "solana", "ripple", "litecoin", "dogecoin"],
    });
  };

  const addCustomWallet = (wallet: CustomWallet) => {
    setCustomWallets(prev => [...prev, wallet]);
  };

  const editWalletName = (id: string, newName: string) => {
    setAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, name: newName } : acc));
    setCustomWallets(prev => prev.map(wallet => wallet.id === id ? { ...wallet, name: newName } : wallet));
  };
  
  const addExternalWallet = (name: string, address: string, currency: string) => {
    const newAccount: Account = {
      id: `external-${address}`,
      address,
      currency,
      balance: new BigNumber(0),
      spendableBalance: new BigNumber(0),
      blockHeight: 0,
      name,
      lastSyncDate: new Date(),
    };
    if (!accounts.find(acc => acc.address === newAccount.address)) {
      setAccounts(prevAccounts => [...prevAccounts, newAccount]);
    }
  };

  const deleteWallet = (id: string) => {
    setAccounts(prevAccounts => prevAccounts.filter(acc => acc.id !== id));
    setCustomWallets(prev => prev.filter(wallet => wallet.id !== id));
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const toggleWallet = (walletName: string) => {
    setExpandedWallets((prev) =>
      prev.includes(walletName) ? prev.filter((name) => name !== walletName) : [...prev, walletName],
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900/20 text-white">
      <div className="flex">
        <div className="w-32 min-h-screen bg-black/60 backdrop-blur-sm border-r border-purple-500/20 p-4">
          <div className="flex flex-col items-center mb-8">
            <span className="text-sm font-bold text-center">Ledger Vision</span>
          </div>

          <nav className="space-y-2">
            {sidebarItems.map((item, index) => (
              <div
                key={index}
                className={`flex flex-col items-center space-y-1 px-2 py-3 rounded-xl cursor-pointer transition-colors ${
                  item.active ? "bg-purple-500" : "hover:bg-white/5"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs text-center">{item.label}</span>
              </div>
            ))}
          </nav>

          <div className="absolute bottom-6 left-4">
            <button className="flex flex-col items-center space-y-1 text-xs text-gray-400 hover:text-white">
              <Settings className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        <div className="flex-1 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold">Welcome back Eric</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search"
                  className="pl-10 bg-black/30 border-purple-500/30 text-white placeholder-gray-400 w-64"
                />
              </div>
              <div className="relative">
                <Bell className="w-5 h-5" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-full"></div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-500 rounded-full"></div>
                <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(true)}>
                   <Settings className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 mb-6">
            {/* Left side - Integrated Portfolio Performance with Stats */}
            <div className="col-span-7">
              <Card className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-2xl">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Portfolio Performance</h3>

                  {/* Stats row integrated at top */}
                  <div className="grid grid-cols-3 gap-6 mb-6">
                    <div className="text-center">
                      <div className="text-sm text-gray-400 mb-1">Total Balance</div>
                      <div className="text-2xl font-bold text-white">
                        {isLoading ? <SkeletonLoader className="h-8 w-32 mx-auto" /> : `$${portfolioStats.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-400 mb-1">Total Profit</div>
                      <div className="text-2xl font-bold text-white">
                        {isLoading ? <SkeletonLoader className="h-8 w-32 mx-auto" /> : `$${portfolioStats.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-400 mb-1">Profit Percentage</div>
                      <div className={`text-2xl font-bold ${portfolioStats.profitPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                       {isLoading ? <SkeletonLoader className="h-8 w-20 mx-auto" /> : `${portfolioStats.profitPercentage >= 0 ? '+' : ''}${portfolioStats.profitPercentage.toFixed(2)}%`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div></div>
                    <div className="flex items-center space-x-2">
                      {(['1d', '1w', '1M', '1y', 'All'] as const).map(interval => (
                        <Button
                          key={interval}
                          variant="ghost"
                          size="sm"
                          className={`text-xs ${timeInterval === interval ? 'bg-purple-500 hover:bg-purple-600' : 'hover:bg-purple-500/20'}`}
                          onClick={() => setTimeInterval(interval as TimeInterval)}
                        >
                          {interval.toUpperCase()}
                        </Button>
                       ))}
                     </div>
                   </div>
                   <div className="h-64 bg-black/40 rounded-xl p-4">
                    {isLoading ? <SkeletonLoader className="h-full w-full" /> : chartData.length > 0 ? (
                      <SimpleAreaChart data={chartData} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <div className="text-sm">No data to display</div>
                        </div>
                      </div>
                    )}
                   </div>
                 </CardContent>
               </Card>
            </div>

            <div className="col-span-5">
              <Card className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-2xl h-full">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Token Allocation</h3>
                    <Button variant="ghost" size="sm" className="text-xs hover:bg-purple-500/20">
                      View All
                    </Button>
                  </div>
                  <div className="space-y-4 h-96 overflow-y-auto">
                    {isLoading ? (
                       Array.from({ length: 5 }).map((_, index) => <SkeletonLoader key={index} className="h-16 w-full" />)
                    ) : (
                      aggregatedTokens.map((token) => {
                        const percentage = portfolioStats.totalBalance > 0 ? (token.usdValue / portfolioStats.totalBalance) * 100 : 0;
                        return (
                          <div key={token.id} className="p-3 bg-black/30 rounded-xl border border-purple-500/20">
                            <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: token.color || '#000' }}>
                                  <span className="text-xs font-bold text-white">{token.ticker.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <div className="font-medium text-sm text-white">{token.name}</div>
                            <div className={`text-xs font-bold ${token.change24h >= 0 ? "text-green-400" : "text-red-400"}`}>
                              {token.change24h >= 0 ? "+" : ""}
                              {token.change24h.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                                <div className="text-sm font-semibold text-white">${token.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                <div className="text-xs text-gray-300">{token.amount.toFixed(4)} {token.ticker}</div>
                          </div>
                        </div>
                            <div className="mt-2 h-1 bg-gray-700/50 rounded-full">
                              <div 
                                className="h-1 rounded-full" 
                                style={{ 
                                  width: `${percentage}%`,
                                  background: `linear-gradient(to right, ${token.color || '#8B5CF6'}, #EC4899)`
                                }}
                              ></div>
                      </div>
                          </div>
                        );
                      })
                   )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-2xl">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Wallets</h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {wallets.map(wallet => (
                  <div key={wallet.id} className="bg-black/30 rounded-xl border border-purple-500/20">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-black/20"
                      onClick={() => toggleWallet(wallet.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg bg-gray-700">
                          <span className="text-xs font-bold text-white">{wallet.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="font-medium text-white">{wallet.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-white">${wallet.totalUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                    </div>
                    {expandedWallets.includes(wallet.id) && (
                      <div className="px-4 pb-3 border-t border-purple-500/20">
                        <div className="pt-3 space-y-2">
                          {wallet.tokens.map((token) => (
                            <div key={token.id} className="flex justify-between items-center text-sm p-2 bg-black/20 rounded-md">
                               <div className="flex items-center space-x-3">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: token.color || '#000' }}>
                                  <span className="text-xs font-bold text-white">{token.ticker.charAt(0).toUpperCase()}</span>
                                </div>
                                <span className="text-gray-300">{token.name}</span>
                              </div>
                              <div className="text-right">
                                <div className="text-white">${token.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                <div className="text-xs text-gray-400">{token.amount.toFixed(4)} {token.ticker}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
            <Card className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-2xl">
              <CardContent className="p-6 flex flex-col items-center text-center justify-center h-full">
                <div className="relative flex justify-center items-center mb-4 h-16">
                  <CircleUserRound className="w-12 h-12 text-white bg-red-500 rounded-full p-1 absolute" style={{ zIndex: 6, left: 'calc(50% - 60px)' }} />
                  <CircleUserRound className="w-12 h-12 text-white bg-blue-400 rounded-full p-1 absolute" style={{ zIndex: 5, left: 'calc(50% - 40px)' }}/>
                  <CircleUserRound className="w-16 h-16 text-white bg-cyan-500 rounded-full p-1 absolute" style={{ zIndex: 4, left: 'calc(50% - 32px)' }}/>
                  <CircleUserRound className="w-12 h-12 text-white bg-gray-500 rounded-full p-1 absolute" style={{ zIndex: 3, left: 'calc(50% - 0px)' }}/>
                  <CircleUserRound className="w-12 h-12 text-white bg-green-500 rounded-full p-1 absolute" style={{ zIndex: 2, left: 'calc(50% + 20px)' }}/>
                </div>
                <h3 className="text-xl font-semibold mb-2 mt-4">Join Our Community</h3>
                <p className="text-sm text-gray-400 mb-6">
                  Connect with other users and get the most out of your dashboard.
                </p>
                <Button className="w-full bg-purple-600 hover:bg-purple-700">Join Now</Button>
                </CardContent>
            </Card>
            </div>

            <div className="mt-6">
              <Card className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-2xl">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
                  <div className="space-y-3">
                    {[
                      { id: 1, type: 'Swap', from: 'ETH', to: 'USDC', amount: 1.5, status: 'Completed', time: '2 min ago' },
                      { id: 2, type: 'Send', token: 'SOL', amount: 10, to: '0xabc...def', status: 'Pending', time: '5 min ago' },
                      { id: 3, type: 'Receive', token: 'BTC', amount: 0.05, from: '0x123...456', status: 'Completed', time: '1 hour ago' },
                      { id: 4, type: 'Interact', program: 'Uniswap V3', status: 'Confirmed', time: '3 hours ago' },
                    ].map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-gray-700/50 rounded-full">
                            {tx.type === 'Swap' && <ArrowRightLeft className="w-4 h-4 text-purple-400" />}
                            {tx.type === 'Send' && <ArrowUpRight className="w-4 h-4 text-red-400" />}
                            {tx.type === 'Receive' && <ArrowDownLeft className="w-4 h-4 text-green-400" />}
                            {tx.type === 'Interact' && <Zap className="w-4 h-4 text-yellow-400" />}
                          </div>
                          <div>
                            <div className="font-medium text-sm text-white">{tx.type === 'Interact' ? `Contract Interaction` : tx.type}</div>
                            <div className="text-xs text-gray-400">
                              {tx.type === 'Swap' && `${tx.from} to ${tx.to}`}
                              {tx.type === 'Send' && `To ${tx.to}`}
                              {tx.type === 'Receive' && `From ${tx.from}`}
                              {tx.type === 'Interact' && tx.program}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold text-sm ${tx.type === 'Receive' ? 'text-green-400' : 'text-white'}`}>
                            {tx.type === 'Swap' && `${tx.amount} ${tx.from}`}
                            {tx.type === 'Send' && `-${tx.amount} ${tx.token}`}
                            {tx.type === 'Receive' && `+${tx.amount} ${tx.token}`}
                            {tx.type === 'Interact' && `Success`}
                          </div>
                          <div className="text-xs text-gray-500">{tx.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
        </div>
      </div>
      <WalletModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        addExternalWallet={addExternalWallet}
        addCustomWallet={addCustomWallet}
        editWalletName={editWalletName}
        accounts={accounts}
        ledgerAccounts={walletApiAccounts || []}
        customWallets={customWallets}
        currencies={currencies || []}
        deleteWallet={deleteWallet}
        truncateAddress={truncateAddress}
      />
    </div>
  )
}
