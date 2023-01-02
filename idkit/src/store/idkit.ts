import create from 'zustand'
import { IDKITStage } from '@/types'
import { worldIDHash } from '@/lib/hashing'
import type { CallbackFn, ErrorState, ISuccessResult } from '@/types'
import type { Config, ConfigSource, StringOrAdvanced } from '@/types/config'

export type IDKitStore = {
	code: string
	open: boolean
	stage: IDKITStage
	autoClose: boolean
	phoneNumber: string
	processing: boolean
	copy: Config['copy']
	signal: StringOrAdvanced
	actionId: StringOrAdvanced
	stringifiedActionId: string // Raw action IDs get hashed and stored (used for phone non-orb signals)
	errorState: ErrorState | null
	successCallbacks: Record<ConfigSource, CallbackFn | undefined> | Record<string, never>

	retryFlow: () => void
	setCode: (code: string) => void
	setOpen: (open: boolean) => void
	setStage: (stage: IDKITStage) => void
	onOpenChange: (open: boolean) => void
	setActionId: (actionId: StringOrAdvanced) => void
	onSuccess: (result: ISuccessResult) => void
	setProcessing: (processing: boolean) => void
	setPhoneNumber: (phoneNumber: string) => void
	setErrorState: (errorState: ErrorState | null) => void
	setOptions: (options: Config, source: ConfigSource) => void
	addSuccessCallback: (cb: CallbackFn, source: ConfigSource) => void
}

const useIDKitStore = create<IDKitStore>()((set, get) => ({
	open: false,
	code: '',
	signal: '',
	actionId: '',
	stringifiedActionId: '',
	phoneNumber: '',
	autoClose: false,
	errorState: null,
	processing: false,
	successCallbacks: {},
	stage: IDKITStage.ENTER_PHONE,
	copy: {},

	setOpen: open => set({ open }),
	setCode: code => set({ code }),
	setStage: stage => set({ stage }),
	setActionId: actionId => {
		const stringifiedActionId = typeof actionId === 'string' ? actionId : worldIDHash(actionId).digest
		set({ actionId, stringifiedActionId })
	},
	setErrorState: errorState => set({ errorState }),
	setPhoneNumber: phoneNumber => set({ phoneNumber }),
	setProcessing: (processing: boolean) => set({ processing }),
	retryFlow: () => set({ stage: IDKITStage.ENTER_PHONE, phoneNumber: '' }),
	addSuccessCallback: (cb: CallbackFn, source: ConfigSource) => {
		set(state => {
			state.successCallbacks[source] = cb

			return state
		})
	},
	setOptions: ({ onSuccess, signal, actionId, autoClose, copy }: Config, source: ConfigSource) => {
		set(store => ({
			actionId,
			signal,
			autoClose,
			copy: { ...store.copy, ...copy },
		}))

		if (onSuccess) get().addSuccessCallback(onSuccess, source)
	},
	onSuccess: (result: ISuccessResult) => {
		Object.values(get().successCallbacks).map(cb => cb?.(result))
		set({ stage: IDKITStage.SUCCESS, processing: false })

		if (get().autoClose) setTimeout(() => set({ open: false }), 1000)
	},
	onOpenChange: open => {
		if (open) return set({ open })
		set({ open, phoneNumber: '', code: '', processing: false, stage: IDKITStage.ENTER_PHONE })
	},
}))

export default useIDKitStore
