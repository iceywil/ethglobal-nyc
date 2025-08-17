"use client";

import { WalletAPIProvider } from "@ledgerhq/wallet-api-client-react";
import { WindowMessageTransport } from "@ledgerhq/wallet-api-client";
import React, { useEffect, useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [transport, setTransport] = useState<WindowMessageTransport>();

  useEffect(() => {
    const transport = new WindowMessageTransport();
    transport.connect();
    setTransport(transport);

    return () => {
      transport.disconnect();
    };
  }, []);

  if (!transport) {
    return null;
  }

  return <WalletAPIProvider transport={transport}>{children}</WalletAPIProvider>;
}
