import { useState, useCallback } from 'react';

/**
 * useRefresh — pairs with FlatList's onRefresh + refreshing props.
 * Usage:  const { refreshing, onRefresh } = useRefresh(fetchData);
 */
export function useRefresh(refetch: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return { refreshing, onRefresh };
}
