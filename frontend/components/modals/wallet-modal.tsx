"use client";

import React, { useState } from 'react';
import Modal from '../ui/modal';
import { Account, CryptoCurrency, TokenCurrency } from '@ledgerhq/wallet-api-client';
import ChainIcon from '../ui/chain-icon';
import { CustomWallet } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown } from 'lucide-react';

type ModalView = 'main' | 'addExternal' | 'addCustom';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  addExternalWallet: (name: string, address: string, currency: string) => void;
  addCustomWallet: (wallet: CustomWallet) => void;
  editWalletName: (id: string, newName: string) => void;
  accounts: Account[];
  ledgerAccounts: Account[];
  customWallets: CustomWallet[];
  currencies: (CryptoCurrency | TokenCurrency)[];
  deleteWallet: (id: string) => void;
  truncateAddress: (address: string) => string;
}

const WalletModal: React.FC<WalletModalProps> = ({ 
  isOpen, 
  onClose, 
  addExternalWallet,
  addCustomWallet,
  editWalletName,
  accounts,
  ledgerAccounts,
  customWallets,
  currencies,
  deleteWallet,
  truncateAddress
}) => {
  const [view, setView] = useState<ModalView>('main');
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [newWalletName, setNewWalletName] = useState('');
  
  const [externalWalletName, setExternalWalletName] = useState('');
  const [externalAddress, setExternalAddress] = useState('');
  const [externalCurrency, setExternalCurrency] = useState('ethereum');

  const [customWalletName, setCustomWalletName] = useState('');
  const [customTokens, setCustomTokens] = useState<{ currency: string; amount: number }[]>([{ currency: '', amount: 0 }]);

  const handleAddExternal = () => {
    if (externalWalletName && externalAddress && externalCurrency) {
      addExternalWallet(externalWalletName, externalAddress, externalCurrency);
      setView('main');
      setExternalWalletName('');
      setExternalAddress('');
      setExternalCurrency('ethereum');
    }
  };

  const handleAddCustomWallet = () => {
    if (customWalletName && customTokens.length > 0) {
      const newWallet: CustomWallet = {
        id: `custom-${Date.now()}`,
        name: customWalletName,
        tokens: customTokens.reduce((acc, token) => {
          if (token.currency && token.amount > 0) {
            acc[token.currency] = token.amount;
          }
          return acc;
        }, {} as { [currency: string]: number }),
      };
      addCustomWallet(newWallet);
      setView('main');
      setCustomWalletName('');
      setCustomTokens([{ currency: '', amount: 0 }]);
    }
  };

  const handleTokenChange = (index: number, field: 'currency' | 'amount', value: string | number) => {
    const newTokens = [...customTokens];
    newTokens[index] = { ...newTokens[index], [field]: value };
    setCustomTokens(newTokens);
  };
  
  const addNewTokenField = () => {
    setCustomTokens([...customTokens, { currency: '', amount: 0 }]);
  };

  const currencyOptions = ["ethereum", "polygon", "bsc", "bitcoin", "solana", "ripple", "litecoin", "dogecoin"];

  const handleEditWalletName = (id: string) => {
    if (newWalletName) {
      editWalletName(id, newWalletName);
      setEditingWalletId(null);
      setNewWalletName('');
    }
  };

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingWalletId(id);
    setNewWalletName(currentName);
  };

  const handleCancelEdit = () => {
    setEditingWalletId(null);
    setNewWalletName('');
  };

  const handleSaveEdit = () => {
    if (editingWalletId && newWalletName) {
      editWalletName(editingWalletId, newWalletName);
      handleCancelEdit();
    }
  };

  const renderMainView = () => (
    <>
      <h2 className="text-2xl font-bold mb-6 text-center">Manage Wallets</h2>
      <div className="space-y-3 mb-6">
        <Button onClick={() => setView('addExternal')} className="w-full bg-purple-600 hover:bg-purple-700 text-white text-lg py-3">Add External Wallet</Button>
        <Button onClick={() => setView('addCustom')} className="w-full bg-purple-600 hover:bg-purple-700 text-white text-lg py-3">Add Custom Wallet (e.g., CEX)</Button>
      </div>
      
      <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
        <h3 className="text-lg font-semibold text-gray-300">Ledger Wallets</h3>
        {ledgerAccounts
          .filter(acc => {
            const currency = currencies.find(c => c.id === acc.currency);
            return currency && currency.type === 'CryptoCurrency';
          })
          .map(acc => (
          <div key={acc.id} className="flex justify-between items-center bg-black/30 p-3 rounded-md">
            <div className="flex items-center space-x-3">
              <ChainIcon currency={acc.currency} />
              <div className="flex flex-col">
                <span className="font-medium text-white">{acc.name}</span>
                <span className="font-mono text-xs text-gray-400">{truncateAddress(acc.address)}</span>
              </div>
            </div>
          </div>
        ))}
        
        <h3 className="text-lg font-semibold text-gray-300 mt-4">Other Wallets</h3>
        {accounts.map(acc => (
          <div key={acc.id}>
            {editingWalletId === acc.id ? (
              <div className="bg-black/30 p-3 rounded-md space-y-2">
                <Input value={newWalletName} onChange={(e) => setNewWalletName(e.target.value)} placeholder="New wallet name" />
                <div className="flex justify-end space-x-2">
                  <Button variant="ghost" size="sm" onClick={handleCancelEdit}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center bg-black/30 p-3 rounded-md">
                <div className="flex items-center space-x-3">
                  <ChainIcon currency={acc.currency} />
                  <div className="flex flex-col">
                    <span className="font-medium text-white">{acc.name}</span>
                    <span className="font-mono text-xs text-gray-400">{truncateAddress(acc.address)}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleStartEdit(acc.id, acc.name)}>Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteWallet(acc.id)}>Delete</Button>
                </div>
              </div>
            )}
          </div>
        ))}
        {customWallets.map(wallet => (
          <div key={wallet.id}>
          {editingWalletId === wallet.id ? (
            <div className="bg-black/30 p-3 rounded-md space-y-2">
              <Input value={newWalletName} onChange={(e) => setNewWalletName(e.target.value)} placeholder="New wallet name" />
              <div className="flex justify-end space-x-2">
                <Button variant="ghost" size="sm" onClick={handleCancelEdit}>Cancel</Button>
                <Button size="sm" onClick={handleSaveEdit}>Save</Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center bg-black/30 p-3 rounded-md">
                <span className="font-medium text-white">{wallet.name}</span>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={() => handleStartEdit(wallet.id, wallet.name)}>Edit</Button>
                <Button variant="destructive" size="sm" onClick={() => deleteWallet(wallet.id)}>Delete</Button>
              </div>
            </div>
            )}
          </div>
        ))}
      </div>
    </>
  );

  const renderAddExternalView = () => (
    <>
      <h2 className="text-2xl font-bold mb-6 text-center">Add External Wallet</h2>
      <Input value={externalWalletName} onChange={(e) => setExternalWalletName(e.target.value)} placeholder="Wallet Name" className="mb-3" />
      <Input value={externalAddress} onChange={(e) => setExternalAddress(e.target.value)} placeholder="Wallet Address" className="mb-3" />
      <div className="relative">
        <select value={externalCurrency} onChange={(e) => setExternalCurrency(e.target.value)} className="w-full h-10 px-3 py-2 rounded-md bg-black/30 border border-purple-500/30 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none">
          {currencyOptions.map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
      <Button onClick={handleAddExternal} className="w-full mt-4">Add Wallet</Button>
      <Button variant="ghost" onClick={() => setView('main')} className="w-full mt-2">Back</Button>
    </>
  );

  const renderAddCustomView = () => (
    <>
      <h2 className="text-2xl font-bold mb-6 text-center">Add Custom Wallet</h2>
      <Input value={customWalletName} onChange={(e) => setCustomWalletName(e.target.value)} placeholder="Wallet Name" className="mb-3"/>
      {customTokens.map((token, index) => (
        <div key={index} className="flex items-center space-x-2 mt-2">
          <div className="relative flex-1">
            <select value={token.currency} onChange={(e) => handleTokenChange(index, 'currency', e.target.value)} className="w-full h-10 px-3 py-2 rounded-md bg-black/30 border border-purple-500/30 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none">
              <option value="">Select Currency</option>
              {currencyOptions.map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <Input type="number" value={token.amount} onChange={(e) => handleTokenChange(index, 'amount', Number(e.target.value))} placeholder="Amount" className="flex-1" />
        </div>
      ))}
      <Button variant="ghost" onClick={addNewTokenField} className="w-full mt-2">Add Another Token</Button>
      <Button onClick={handleAddCustomWallet} className="w-full mt-4">Add Wallet</Button>
      <Button variant="ghost" onClick={() => setView('main')} className="w-full mt-2">Back</Button>
    </>
  );
  
  return (
    <Modal isOpen={isOpen} onClose={() => { setView('main'); onClose(); }}>
      <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 text-white rounded-lg p-6 shadow-lg" style={{minWidth: '500px'}}>
        {view === 'main' && renderMainView()}
        {view === 'addExternal' && renderAddExternalView()}
        {view === 'addCustom' && renderAddCustomView()}
      </div>
    </Modal>
  );
};

export default WalletModal;
