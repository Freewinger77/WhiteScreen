"use client";

import React, { useState, useContext, ReactNode, useEffect, useRef } from "react";
import { User } from "@/types/user";
import { useClerk, useOrganization } from "@clerk/nextjs";
import { ClientService } from "@/services/clients.service";

interface ClientContextProps {
  client?: User;
}

export const ClientContext = React.createContext<ClientContextProps>({
  client: undefined,
});

interface ClientProviderProps {
  children: ReactNode;
}

export function ClientProvider({ children }: ClientProviderProps) {
  const [client, setClient] = useState<User>();
  const { user } = useClerk();
  const { organization } = useOrganization();

  const [clientLoading, setClientLoading] = useState(true);
  const lastUserIdRef = useRef<string | null>(null);
  const lastOrgIdRef = useRef<string | null>(null);

  const fetchClient = async () => {
    try {
      setClientLoading(true);
      const response = await ClientService.getClientById(
        user?.id as string,
        user?.emailAddresses[0]?.emailAddress as string,
        organization?.id as string,
      );
      setClient(response);
    } catch (error) {
      console.error(error);
    }
    setClientLoading(false);
  };

  const fetchOrganization = async () => {
    try {
      setClientLoading(true);
      const response = await ClientService.getOrganizationById(
        organization?.id as string,
        organization?.name as string,
      );
    } catch (error) {
      console.error(error);
    }
    setClientLoading(false);
  };

  useEffect(() => {
    const userId = user?.id || null;
    if (userId && lastUserIdRef.current !== userId) {
      lastUserIdRef.current = userId;
      fetchClient();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const orgId = organization?.id || null;
    if (orgId && lastOrgIdRef.current !== orgId) {
      lastOrgIdRef.current = orgId;
      fetchOrganization();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id]);

  return (
    <ClientContext.Provider
      value={{
        client,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
}

export const useClient = () => {
  const value = useContext(ClientContext);

  return value;
};
