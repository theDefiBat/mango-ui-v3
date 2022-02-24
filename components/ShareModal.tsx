import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  createRef,
  useState,
} from 'react'
import { getWeights, MarketConfig } from '@blockworks-foundation/mango-client'

import useMangoStore from '../stores/useMangoStore'
import Modal from './Modal'
import { useScreenshot } from '../hooks/useScreenshot'
import * as MonoIcons from './icons'
import { TwitterIcon } from './icons'
import QRCode from 'react-qr-code'
import useMangoAccount from '../hooks/useMangoAccount'
import {
  mangoCacheSelector,
  mangoClientSelector,
  mangoGroupConfigSelector,
  mangoGroupSelector,
  marketConfigSelector,
} from '../stores/selectors'
import {
  getMarketIndexBySymbol,
  ReferrerIdRecord,
} from '@blockworks-foundation/mango-client'
import Button from './Button'
import Switch from './Switch'

interface ShareModalProps {
  onClose: () => void
  isOpen: boolean
  position: {
    indexPrice: number
    avgEntryPrice: number
    basePosition: number
    marketConfig: MarketConfig
  }
}

const ShareModal: FunctionComponent<ShareModalProps> = ({
  isOpen,
  onClose,
  position,
}) => {
  const ref = createRef()
  const [copied, setCopied] = useState(false)
  const [showButton, setShowButton] = useState(true)
  const marketConfig = useMangoStore(marketConfigSelector)
  const [image, takeScreenshot] = useScreenshot()
  const { mangoAccount } = useMangoAccount()
  const mangoCache = useMangoStore(mangoCacheSelector)
  const groupConfig = useMangoStore(mangoGroupConfigSelector)
  const client = useMangoStore(mangoClientSelector)
  const mangoGroup = useMangoStore(mangoGroupSelector)
  const [customRefLinks, setCustomRefLinks] = useState<ReferrerIdRecord[]>([])
  const [showSize, setShowSize] = useState(true)
  const [showReferral, setShowReferral] = useState(false)
  const [hasRequiredMngo, setHasRequiredMngo] = useState(false)

  const initLeverage = useMemo(() => {
    if (!mangoGroup || !marketConfig) return 1

    const ws = getWeights(mangoGroup, marketConfig.marketIndex, 'Init')
    return Math.round((100 * -1) / (ws.perpAssetWeight.toNumber() - 1)) / 100
  }, [mangoGroup, marketConfig])

  const positionPercentage =
    position.basePosition > 0
      ? ((position.indexPrice - position.avgEntryPrice) /
          position.avgEntryPrice) *
        100 *
        initLeverage
      : ((position.avgEntryPrice - position.indexPrice) /
          position.avgEntryPrice) *
        100 *
        initLeverage

  const side = position.basePosition > 0 ? 'LONG' : 'SHORT'

  async function copyToClipboard(image) {
    try {
      image.toBlob((blob) => {
        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      }, 'image/png')
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    const mngoIndex = getMarketIndexBySymbol(groupConfig, 'MNGO')

    const hasRequiredMngo =
      mangoGroup && mangoAccount
        ? mangoAccount
            .getUiDeposit(
              mangoCache.rootBankCache[mngoIndex],
              mangoGroup,
              mngoIndex
            )
            .toNumber() >= 10000
        : false

    if (hasRequiredMngo) {
      setHasRequiredMngo(true)
    }
  }, [mangoAccount, mangoGroup])

  useEffect(() => {
    if (image) {
      copyToClipboard(image)
      setCopied(true)
      setShowButton(true)
    }
  }, [image])

  useEffect(() => {
    // if the button is hidden we are taking a screenshot
    if (!showButton) {
      takeScreenshot(ref.current)
    }
  }, [showButton])

  const handleCopyToClipboard = () => {
    setShowButton(false)
  }

  const fetchCustomReferralLinks = useCallback(async () => {
    // setLoading(true)
    const referrerIds = await client.getReferrerIdsForMangoAccount(mangoAccount)

    setCustomRefLinks(referrerIds)
    // setLoading(false)
  }, [mangoAccount])

  useEffect(() => {
    if (mangoAccount) {
      fetchCustomReferralLinks()
    }
  }, [mangoAccount])

  const isProfit = positionPercentage > 0

  const iconName = `${marketConfig.baseSymbol.slice(
    0,
    1
  )}${marketConfig.baseSymbol.slice(1, 4).toLowerCase()}MonoIcon`

  const SymbolIcon = MonoIcons[iconName]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className={`-mt-40 ${
        side === 'LONG'
          ? isProfit
            ? 'bg-long-profit'
            : 'bg-long-loss'
          : isProfit
          ? 'bg-short-profit'
          : 'bg-short-loss'
      } bg-contain h-[337.5px] w-[600px] sm:max-w-7xl`}
      noPadding
      hideClose
      ref={ref}
    >
      <div
        id="share-image"
        className="drop-shadow-lg flex flex-col h-full items-center justify-center space-y-4 relative z-20"
      >
        {hasRequiredMngo && showReferral ? (
          <div className="absolute right-4 top-4">
            <QRCode
              size={64}
              value={
                customRefLinks.length > 0
                  ? `https://trade.mango.markets?ref=${customRefLinks[0].referrerId}`
                  : `https://trade.mango.markets?ref=${mangoAccount.publicKey.toString()}`
              }
            />
          </div>
        ) : null}
        <div className="flex items-center text-lg text-th-fgd-3 text-center">
          <SymbolIcon className="h-6 w-auto mr-2" />
          <span className="mr-2">{position.marketConfig.name}</span>
          <span
            className={`border px-1 rounded ${
              position.basePosition > 0
                ? 'border-th-green text-th-green'
                : 'border-th-red text-th-red'
            }`}
          >
            {side}
          </span>
        </div>
        <div
          className={`font-bold text-6xl text-center ${
            isProfit
              ? 'border-th-green text-th-green'
              : 'border-th-red text-th-red'
          }`}
        >
          {positionPercentage > 0 ? '+' : null}
          {positionPercentage.toFixed(2)}%
        </div>
        <div className="pt-2 space-y-1 text-base text-th-fgd-1 w-2/3">
          {showSize ? (
            <div className="flex items-center justify-between">
              <span className="text-th-fgd-2">Size</span>
              <span className="font-bold">
                {Math.abs(position.basePosition)}
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <span className="text-th-fgd-2">Avg Entry Price</span>
            <span className="font-bold">
              ${position.avgEntryPrice.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-th-fgd-2">Mark Price</span>
            <span className="font-bold">${position.indexPrice.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-th-fgd-2">Max Leverage</span>
            <span className="font-bold">{initLeverage}x</span>
          </div>
        </div>
      </div>
      <div className="absolute bg-th-bkg-2 left-1/2 mt-3 p-4 rounded-md transform -translate-x-1/2 w-[600px]">
        <div className="flex flex-col items-center">
          <div className="flex pb-4 space-x-4">
            <div className="flex items-center">
              <label className="mr-1.5 text-th-fgd-2">Show Size</label>
              <Switch
                checked={showSize}
                onChange={(checked) => setShowSize(checked)}
              />
            </div>
            {hasRequiredMngo ? (
              <div className="flex items-center">
                <label className="mr-1.5 text-th-fgd-2">
                  Show Referral Link
                </label>
                <Switch
                  checked={showReferral}
                  onChange={(checked) => setShowReferral(checked)}
                />
              </div>
            ) : null}
          </div>
          {copied ? (
            <a
              className="bg-th-bkg-button flex items-center justify-center font-bold block px-6 py-2 rounded-full text-center text-th-fgd-1 hover:cursor-pointer hover:text-th-fgd-1 hover:brightness-[1.1]"
              href={`https://twitter.com/intent/tweet?text=I'm ${side} %24${position.marketConfig.baseSymbol} perp on %40mangomarkets%0A[PASTE IMAGE HERE]`}
              target="_blank"
              rel="noreferrer"
            >
              <TwitterIcon className="h-4 mr-1.5 w-4" />
              <div>Tweet Position</div>
            </a>
          ) : (
            <div>
              <Button onClick={handleCopyToClipboard}>
                <div className="flex items-center">
                  <TwitterIcon className="h-4 mr-1.5 w-4" />
                  Copy Image and Share
                </div>
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default ShareModal
