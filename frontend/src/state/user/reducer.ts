import { createSlice } from '@reduxjs/toolkit'
import { ConnectionType } from 'connection/types'
import { SupportedLocale } from 'constants/locales'
import { RouterPreference } from 'state/routing/slice'

import { DEFAULT_DEADLINE_FROM_NOW } from '../../constants/misc'
import { updateVersion } from '../global/actions'
import { SerializedPair, SerializedToken, SlippageTolerance } from './types'

const currentTimestamp = () => new Date().getTime()

interface UserState {
  buyFiatFlowCompleted: boolean | undefined

  selectedWallet?: ConnectionType

  // the timestamp of the last updateVersion action
  lastUpdateVersionTimestamp?: number

  userLocale: SupportedLocale | null

  userExpertMode: boolean

  // which router should be used to calculate trades
  userRouterPreference: RouterPreference

  // hides closed (inactive) positions across the app
  userHideClosedPositions: boolean

  // user defined slippage tolerance in bips, used in all txns
  userSlippageTolerance: number | SlippageTolerance.Auto

  // flag to indicate whether the user has been migrated from the old slippage tolerance values
  userSlippageToleranceHasBeenMigratedToAuto: boolean

  // deadline set by user in minutes, used in all txns
  userDeadline: number

  tokens: {
    [chainId: number]: {
      [address: string]: SerializedToken
    }
  }

  pairs: {
    [chainId: number]: {
      // keyed by token0Address:token1Address
      [key: string]: SerializedPair
    }
  }

  timestamp: number
  URLWarningVisible: boolean
  hideUniswapWalletBanner: boolean
  // undefined means has not gone through A/B split yet
  showSurveyPopup: boolean | undefined
}

const initialState: UserState = {
  buyFiatFlowCompleted: undefined,
  selectedWallet: undefined,
  userExpertMode: false,
  userLocale: null,
  userRouterPreference: RouterPreference.AUTO,
  userHideClosedPositions: false,
  userSlippageTolerance: SlippageTolerance.Auto,
  userSlippageToleranceHasBeenMigratedToAuto: true,
  userDeadline: DEFAULT_DEADLINE_FROM_NOW,
  tokens: {},
  pairs: {},
  timestamp: currentTimestamp(),
  URLWarningVisible: true,
  hideUniswapWalletBanner: false,
  showSurveyPopup: undefined,
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    updateSelectedWallet(state, { payload: { wallet } }) {
      state.selectedWallet = wallet
    },
    updateUserExpertMode(state, action) {
      state.userExpertMode = action.payload.userExpertMode
      state.timestamp = currentTimestamp()
    },
    updateUserLocale(state, action) {
      state.userLocale = action.payload.userLocale
      state.timestamp = currentTimestamp()
    },
  },
  extraReducers: (builder) => {
    // After adding a new property to the state, its value will be `undefined` (instead of the default)
    // for all existing users with a previous version of the state in their localStorage.
    // In order to avoid this, we need to set a default value for each new property manually during hydration.
    builder.addCase(updateVersion, (state) => {
      // If `userSlippageTolerance` is not present or its value is invalid, reset to default
      if (
        typeof state.userSlippageTolerance !== 'number' ||
        !Number.isInteger(state.userSlippageTolerance) ||
        state.userSlippageTolerance < 0 ||
        state.userSlippageTolerance > 5000
      ) {
        state.userSlippageTolerance = SlippageTolerance.Auto
      } else {
        if (
          !state.userSlippageToleranceHasBeenMigratedToAuto &&
          [10, 50, 100].indexOf(state.userSlippageTolerance) !== -1
        ) {
          state.userSlippageTolerance = SlippageTolerance.Auto
          state.userSlippageToleranceHasBeenMigratedToAuto = true
        }
      }

      // If `userDeadline` is not present or its value is invalid, reset to default
      if (
        typeof state.userDeadline !== 'number' ||
        !Number.isInteger(state.userDeadline) ||
        state.userDeadline < 60 ||
        state.userDeadline > 180 * 60
      ) {
        state.userDeadline = DEFAULT_DEADLINE_FROM_NOW
      }

      // If `userRouterPreference` is not present, reset to default
      if (typeof state.userRouterPreference !== 'string') {
        state.userRouterPreference = RouterPreference.AUTO
      }

      state.lastUpdateVersionTimestamp = currentTimestamp()
    })
  },
})

export const { updateSelectedWallet, updateUserExpertMode, updateUserLocale } = userSlice.actions
export default userSlice.reducer
