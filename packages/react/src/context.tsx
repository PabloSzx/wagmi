import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Provider, WebSocketProvider } from '@wagmi/core'
import * as React from 'react'
import {
  ClientConfig,
  Provider,
  Client as VanillaClient,
  WebSocketProvider,
  createClient as createVanillaClient,
} from '@wagmi/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  Persister,
  persistQueryClient,
} from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

import { deserialize, serialize } from './utils'

export type CreateClientConfig<
  TProvider extends Provider = Provider,
  TWebSocketProvider extends WebSocketProvider = WebSocketProvider,
> = ClientConfig<TProvider, TWebSocketProvider> & {
  queryClient?: QueryClient
  persister?: Persister
}
export function createClient<
  TProvider extends Provider,
  TWebSocketProvider extends WebSocketProvider,
>({
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        cacheTime: 1_000 * 60 * 60 * 24, // 24 hours
        networkMode: 'offlineFirst',
        refetchOnWindowFocus: false,
        retry: 0,
      },
      mutations: {
        networkMode: 'offlineFirst',
      },
    },
  }),
  persister = typeof window !== 'undefined'
    ? createSyncStoragePersister({
        key: 'wagmi.cache',
        storage: window.localStorage,
        serialize,
        deserialize,
      })
    : undefined,
  ...config
}: CreateClientConfig<TProvider, TWebSocketProvider>) {
  const client = createVanillaClient<TProvider, TWebSocketProvider>(config)
  if (persister)
    persistQueryClient({
      queryClient,
      persister,
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => query.cacheTime !== 0,
      },
    })
  return Object.assign(client, { queryClient })
}

export type Client<
  TProvider extends Provider = Provider,
  TWebSocketProvider extends WebSocketProvider = WebSocketProvider,
> = VanillaClient<TProvider, TWebSocketProvider> & { queryClient: QueryClient }

export const Context = React.createContext<
  Client<Provider, WebSocketProvider> | undefined
>(undefined)

export type WagmiConfigProps<
  TProvider extends Provider = Provider,
  TWebSocketProvider extends WebSocketProvider = WebSocketProvider,
> = {
  /** React-decorated Client instance */
  client: Client<TProvider, TWebSocketProvider>
}
export function WagmiConfig<
  TProvider extends Provider,
  TWebSocketProvider extends WebSocketProvider,
>({
  children,
  client,
}: React.PropsWithChildren<WagmiConfigProps<TProvider, TWebSocketProvider>>) {
  return (
    <Context.Provider value={client as unknown as Client}>
      <QueryClientProvider client={client.queryClient}>
        {children}
      </QueryClientProvider>
    </Context.Provider>
  )
}

export function useClient<
  TProvider extends Provider,
  TWebSocketProvider extends WebSocketProvider = WebSocketProvider,
>() {
  const client = React.useContext(Context) as unknown as Client<
    TProvider,
    TWebSocketProvider
  >
  if (!client)
    throw new Error(
      [
        '`useClient` must be used within `WagmiConfig`.\n',
        'Read more: https://wagmi.sh/docs/WagmiConfig',
      ].join('\n'),
    )
  return client
}
