import { useEffect, useState } from 'react'

import { ChangeNotification } from '../../notifiers/index'
import { randomValue } from '../../util/random'
import { QualifiedTablename, hasIntersection } from '../../util/tablename'
import { BindParams, Query, Row } from '../../util/types'

import { useElectric } from './provider'

interface TablenameData {
  tablenames?: QualifiedTablename[],
  tablenamesKey?: string
}

// Utility hook for a random value that sets the value to a random
// string on create and provides an update function that generates
// and assigns the value to a new random string.
export const useRandom = () => {
  const [ value, _setValue ] = useState<string>(randomValue())
  const setRandomValue = () => _setValue(randomValue())

  return [ value, setRandomValue ] as const
}

// Main reactive query hook for React applications. It needs to be
// used in tandem with the `ElectricProvider` in `./provider` which
// sets an `ElectricNamespace` as the `electric` value. This provides
// a queryAdapter and notifier which this hook uses to:
//
// 1. parse the tablenames out of the query (which can be a string or
//    an object, depending on your driver/framework of choice)
// 2. subscribe to data change notifications to matching tables
// 3. (re)-run the query whenever the underlying data potentially changes
//
// Running the query successfully will assign a new array of rows to
// the `results` state variable. Or if the query errors, the error will
// be assigned to the `error` variable.
//
// The hook returns `[ results, error ]`.
export const useElectricQuery = (query: Query, params?: BindParams) => {
  const electric = useElectric()

  const [ cacheKey, bustCache ] = useRandom()
  const [ changeSubscriptionKey, setChangeSubscriptionKey ] = useState<string>()
  const [ { tablenames, tablenamesKey }, setTablenameData ] = useState<TablenameData>({})

  const [ error, setError ] = useState<any>()
  const [ results, setResults ] = useState<Row[]>()

  // When the `electric` namespace has been configured on the provider,
  // we use the `queryAdapter` to parse out the query tablenames.
  useEffect(() => {
    if (electric === undefined) {
      return
    }

    const tablenames = electric.queryAdapter.tableNames(query)
    const tablenamesKey = JSON.stringify(tablenames)

    setTablenameData({ tablenames, tablenamesKey })
  }, [electric, query])

  // Once we have the tablenames, we then establish the data change
  // notification subscription, comparing the tablenames used by the
  // query with the changed tablenames in the data change notification
  // to determine whether to re-query or not.
  //
  // If we do need to re-query, then we call `bustCache` to set a new
  // random cacheKey value, which is a dependency of the the next
  // useEffect function below.
  useEffect(() => {
    if (electric === undefined || tablenames === undefined) {
      return
    }

    const handleChange = (notification: ChangeNotification): void => {
      const changes = notification.changes
      const changedTablenames = changes.map(change => change.qualifiedTablename)

      if (hasIntersection(tablenames, changedTablenames)) {
        bustCache()
      }
    }

    const notifier = electric.notifier
    const key = notifier.subscribeToDataChanges(handleChange)

    if (changeSubscriptionKey !== undefined) {
      notifier.unsubscribeFromDataChanges(changeSubscriptionKey)
    }
    setChangeSubscriptionKey(key)

    return () => notifier.unsubscribeFromDataChanges(key)
  }, [electric, tablenamesKey])

  // Once we have the subscription established, we're ready to query
  // the database and then setResults or setError depending on whether
  // the query succeeds or not.
  //
  // We re-run this function whenever the query, params or cache key
  // change -- the query is proxied in the dependencies by the
  // tablenamesKey, the params are converted to a string so they're
  // compared by value rather than reference and the cacheKey is
  // updated whenever a data change notification is recieved that
  // may potentially change the query results.
  useEffect(() => {
    if (electric === undefined || tablenames === undefined || changeSubscriptionKey === undefined) {
      return
    }

    electric.queryAdapter.perform(query, params)
      .then((res) => setResults(res))
      .catch((err) => setError(err))
  }, [electric, cacheKey, tablenamesKey, JSON.stringify(params)])

  return [ results, error ] as const
}
