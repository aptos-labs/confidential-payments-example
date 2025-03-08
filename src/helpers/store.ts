import { INTERNAL_Snapshot, proxy, subscribe, useSnapshot } from 'valtio'

export const createStore = <S extends object, A>(
  storeName: string,
  initialState: S,
  actions: (state: S) => A,
): [Readonly<S> & A, () => INTERNAL_Snapshot<S>] => {
  const storageState = localStorage.getItem(storeName)

  let parsedStorageState: S = {} as S

  try {
    parsedStorageState = JSON.parse(storageState!)
  } catch (_) {
    /* empty */
  }

  const state = proxy<S>({
    ...initialState,
    ...parsedStorageState,
  })

  subscribe(state, () => {
    localStorage.setItem(storeName, JSON.stringify(state))
  })

  return [Object.assign(state, actions(state)), () => useSnapshot(state)]
}
