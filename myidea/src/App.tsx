import { useEffect, useMemo, useState } from 'react'
import styles from './GameArea.module.css'
import { generateAnswerChoices } from './baccarat/answerChoices'
import type { Bet } from './baccarat/bet'
import { generateRandomBet } from './baccarat/bet'
import type { DealtHand } from './baccarat/dealHand'
import type { Outcome } from './baccarat/outcome'
import { judgeOutcome } from './baccarat/outcome'
import { isPair } from './baccarat/pair'
import { calculatePayout, PAIR_MULTIPLIER, WIN_MULTIPLIERS } from './baccarat/payout'
import {
  getBankerActionWhenPlayerDrew,
  getBankerActionWhenPlayerStands,
} from './baccarat/bankerRule'
import { getPlayerAction } from './baccarat/playerRule'
import { dealRandomHand } from './baccarat/randomHand'
import type { Card, Suit } from './baccarat/score'
import { calculateScore } from './baccarat/score'

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
}

const BET_TYPE_LABEL: Record<Bet['type'], string> = {
  player: 'Player',
  banker: 'Banker',
  tie: 'Tie',
  playerPair: 'Player Pair',
  bankerPair: 'Banker Pair',
}

// 実際のバカラテーブルのレイアウトに合わせた並び順(外側にPairボックス、中央にメインベット)。
const BET_SPOT_ORDER: Bet['type'][] = ['playerPair', 'player', 'tie', 'banker', 'bankerPair']

const OUTCOME_LABEL: Record<Outcome, string> = {
  player: 'Player win',
  banker: 'Banker win',
  tie: 'Tie',
}

type DrawStandAnswer = 'draw' | 'stand'
type DealPhase = 'betting' | 'answering'
type AnswerStep = 'player' | 'banker' | 'outcome' | 'payout' | 'done'
const DEAL_PHASE_DELAY_MS = 2000

interface Stats {
  correct: number
  total: number
}

const INITIAL_STATS: Stats = { correct: 0, total: 0 }

function accuracyPercent(stats: Stats): number {
  if (stats.total === 0) return 0
  return Math.round((stats.correct / stats.total) * 100)
}

function combineStats(...statsList: Stats[]): Stats {
  return statsList.reduce(
    (acc, s) => ({ correct: acc.correct + s.correct, total: acc.total + s.total }),
    { correct: 0, total: 0 },
  )
}

function isRedSuit(suit?: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds'
}

// バカラ公式の配布順(Player1枚目→Banker1枚目→Player2枚目→Banker2枚目)における
// 各手札の連番。3枚目以降(indexが2以上)はこの演出の対象外。
function initialDealSeqIndex(handType: 'player' | 'banker', cardIndex: number): number | null {
  if (cardIndex === 0) return handType === 'player' ? 0 : 1
  if (cardIndex === 1) return handType === 'player' ? 2 : 3
  return null
}

function PlayingCard({ card, faceUp }: { card: Card; faceUp: boolean }) {
  const innerClassNames = [styles.flipCardInner, faceUp ? styles.isFlipped : '']
    .filter(Boolean)
    .join(' ')
  const frontClassNames = [styles.flipCardFront, isRedSuit(card.suit) ? styles.cardRed : styles.cardBlack].join(' ')
  return (
    <span className={styles.flipCard}>
      <span className={innerClassNames}>
        <span className={styles.flipCardBack} aria-hidden="true" />
        <span className={frontClassNames}>
          <span className={styles.cardRank}>{card.rank}</span>
          {card.suit && <span className={styles.cardSuit}>{SUIT_SYMBOLS[card.suit]}</span>}
        </span>
      </span>
    </span>
  )
}

// カード配布中画面のPlayer/Bankerボックス上の番号枠(1・2・3)へ、中央から飛んで着地する演出付きで配置する。
function HandCards({
  cards,
  handType,
  dealStep,
  revealStep,
}: {
  cards: Card[]
  handType: 'player' | 'banker'
  dealStep: number
  revealStep: number
}) {
  return (
    <>
      {cards.map((card, index) => {
        const seqIndex = initialDealSeqIndex(handType, index)
        const slotClass = styles[`dealCard_${handType}${index + 1}`]
        if (seqIndex === null) {
          return (
            <span key={index} className={`${styles.dealCard} ${slotClass}`}>
              <PlayingCard card={card} faceUp />
            </span>
          )
        }
        if (dealStep <= seqIndex) return null
        return (
          <span key={index} className={`${styles.dealCard} ${slotClass}`}>
            <PlayingCard card={card} faceUp={revealStep > seqIndex} />
          </span>
        )
      })}
    </>
  )
}

function formatPlayerReason(initialScore: number): string {
  const action = getPlayerAction(initialScore)
  if (action === 'natural') return `点数${initialScore}(8-9・ナチュラル)は止める`
  if (action === 'stand') return `点数${initialScore}(6-7)は止める`
  return `点数${initialScore}(0-5)は引く`
}

function formatBankerReason(
  bankerScore: number,
  playerDrew: boolean,
  playerThirdCardValue: number,
): string {
  if (!playerDrew) {
    const action = getBankerActionWhenPlayerStands(bankerScore)
    const verb = action === 'draw' ? '引く' : '止める'
    return `Banker点数${bankerScore}、Playerが第三カードを引いていないため${verb}`
  }
  const action = getBankerActionWhenPlayerDrew(bankerScore, playerThirdCardValue)
  const verb = action === 'draw' ? '引く' : '止める'
  return `Banker点数${bankerScore}、Playerの第三カードが${playerThirdCardValue}のため${verb}`
}

function formatOutcomeReason(playerScore: number, bankerScore: number): string {
  if (playerScore === bankerScore) return `Player点数${playerScore} = Banker点数${bankerScore}`
  if (playerScore > bankerScore) return `Player点数${playerScore} > Banker点数${bankerScore}`
  return `Player点数${playerScore} < Banker点数${bankerScore}`
}

function formatPayoutReason(
  bet: Bet,
  correctOutcome: Outcome,
  playerPair: boolean,
  bankerPair: boolean,
): string {
  if (bet.type === 'player' || bet.type === 'banker' || bet.type === 'tie') {
    if (bet.type === correctOutcome) {
      return `${BET_TYPE_LABEL[bet.type]}的中のため${WIN_MULTIPLIERS[bet.type]}倍`
    }
    return `${BET_TYPE_LABEL[bet.type]}が外れたため0倍`
  }
  const paired = bet.type === 'playerPair' ? playerPair : bankerPair
  if (paired) return `${BET_TYPE_LABEL[bet.type]}成立のため${PAIR_MULTIPLIER}倍`
  return `${BET_TYPE_LABEL[bet.type]}不成立のため0倍`
}

function App() {
  const [screen, setScreen] = useState<'title' | 'main'>('title')
  const [showHelp, setShowHelp] = useState(false)
  const [hand, setHand] = useState<DealtHand>(() => dealRandomHand())
  const [bet, setBet] = useState<Bet>(() => generateRandomBet())
  const [playerAnswer, setPlayerAnswer] = useState<DrawStandAnswer | null>(null)
  const [bankerAnswer, setBankerAnswer] = useState<DrawStandAnswer | null>(null)
  const [outcomeAnswer, setOutcomeAnswer] = useState<Outcome | null>(null)
  const [payoutAnswer, setPayoutAnswer] = useState<number | null>(null)
  const [playerStats, setPlayerStats] = useState<Stats>(INITIAL_STATS)
  const [bankerStats, setBankerStats] = useState<Stats>(INITIAL_STATS)
  const [outcomeStats, setOutcomeStats] = useState<Stats>(INITIAL_STATS)
  const [payoutStats, setPayoutStats] = useState<Stats>(INITIAL_STATS)
  const [showCheatSheet, setShowCheatSheet] = useState(false)
  const [showScore, setShowScore] = useState(false)
  const [dealPhase, setDealPhase] = useState<DealPhase>('betting')
  const [answerStep, setAnswerStep] = useState<AnswerStep>('player')
  const [dealStep, setDealStep] = useState(0)
  const [revealStep, setRevealStep] = useState(0)
  // dealPhaseの値が変わらない場合(例: betting中に「次のハンドへ」を押す)でも
  // このカウンタを進めることで、下のタイマーを必ず2秒リセットさせる。
  const [roundId, setRoundId] = useState(0)

  useEffect(() => {
    if (screen !== 'main' || dealPhase === 'answering') return
    const timer = setTimeout(() => setDealPhase('answering'), DEAL_PHASE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [screen, dealPhase, roundId])

  useEffect(() => {
    if (dealPhase !== 'answering' || dealStep >= 4) return
    const timer = setTimeout(() => setDealStep((step) => step + 1), 300)
    return () => clearTimeout(timer)
  }, [dealPhase, dealStep])

  useEffect(() => {
    if (dealStep < 4 || revealStep >= 4) return
    const timer = setTimeout(() => setRevealStep((step) => step + 1), 400)
    return () => clearTimeout(timer)
  }, [dealStep, revealStep])

  useEffect(() => {
    if (playerAnswer === null) return
    const timer = setTimeout(() => setAnswerStep('banker'), DEAL_PHASE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [playerAnswer])

  useEffect(() => {
    if (bankerAnswer === null) return
    const timer = setTimeout(() => setAnswerStep('outcome'), DEAL_PHASE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [bankerAnswer])

  useEffect(() => {
    if (outcomeAnswer === null) return
    const timer = setTimeout(() => setAnswerStep('payout'), DEAL_PHASE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [outcomeAnswer])

  useEffect(() => {
    if (payoutAnswer === null) return
    const timer = setTimeout(() => setAnswerStep('done'), DEAL_PHASE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [payoutAnswer])

  const playerInitialCards = hand.player.slice(0, 2)
  const bankerInitialCards = hand.banker.slice(0, 2)
  const playerInitialScore = calculateScore(playerInitialCards)
  const bankerInitialScore = calculateScore(bankerInitialCards)
  const playerDrew = hand.player.length > 2
  const playerThirdCardValue = playerDrew ? calculateScore([hand.player[2]]) : 0
  const correctPlayerAnswer: DrawStandAnswer = playerDrew ? 'draw' : 'stand'
  const correctBankerAnswer: DrawStandAnswer = hand.banker.length > 2 ? 'draw' : 'stand'
  const finalPlayerScore = calculateScore(hand.player)
  const finalBankerScore = calculateScore(hand.banker)
  const correctOutcome = judgeOutcome(hand.player, hand.banker)
  const playerPair = isPair([hand.player[0], hand.player[1]])
  const bankerPair = isPair([hand.banker[0], hand.banker[1]])
  const correctPayout = calculatePayout(bet, {
    outcome: correctOutcome,
    playerPair,
    bankerPair,
  })
  const payoutChoices = useMemo(() => generateAnswerChoices(correctPayout), [hand, bet])

  const handlePlayerAnswer = (answer: DrawStandAnswer) => {
    setPlayerAnswer(answer)
    setPlayerStats((prev) => ({
      correct: prev.correct + (answer === correctPlayerAnswer ? 1 : 0),
      total: prev.total + 1,
    }))
  }

  const handleBankerAnswer = (answer: DrawStandAnswer) => {
    setBankerAnswer(answer)
    setBankerStats((prev) => ({
      correct: prev.correct + (answer === correctBankerAnswer ? 1 : 0),
      total: prev.total + 1,
    }))
  }

  const handleOutcomeAnswer = (answer: Outcome) => {
    setOutcomeAnswer(answer)
    setOutcomeStats((prev) => ({
      correct: prev.correct + (answer === correctOutcome ? 1 : 0),
      total: prev.total + 1,
    }))
  }

  const handlePayoutAnswer = (answer: number) => {
    setPayoutAnswer(answer)
    setPayoutStats((prev) => ({
      correct: prev.correct + (answer === correctPayout ? 1 : 0),
      total: prev.total + 1,
    }))
  }

  const handleNextHand = () => {
    setHand(dealRandomHand())
    setBet(generateRandomBet())
    setPlayerAnswer(null)
    setBankerAnswer(null)
    setOutcomeAnswer(null)
    setPayoutAnswer(null)
    setDealPhase('betting')
    setAnswerStep('player')
    setDealStep(0)
    setRevealStep(0)
    setRoundId((id) => id + 1)
  }

  const handleResetScore = () => {
    if (!window.confirm('スコアをリセットしますか?')) return
    setPlayerStats(INITIAL_STATS)
    setBankerStats(INITIAL_STATS)
    setOutcomeStats(INITIAL_STATS)
    setPayoutStats(INITIAL_STATS)
  }

  if (screen === 'title') {
    return (
      <main className={styles.titleScreen}>
        <h1>バカラディーラー判断練習</h1>
        <div className={styles.titleActions}>
          <button type="button" className={styles.button} onClick={() => setScreen('main')}>
            はじめる
          </button>
          <button
            type="button"
            className={styles.button}
            aria-expanded={showHelp}
            onClick={() => setShowHelp((prev) => !prev)}
          >
            使い方
          </button>
        </div>
        {showHelp && (
          <div className={styles.titleHelp}>
            <p>
              Player・Bankerそれぞれの手札が表示されたら、第三カードルールに沿ってDraw(引く)かStand(止める)かを答えます。
            </p>
            <p>
              全カードが公開されたら、Player win / Banker win / Tieの3択で勝敗を答えます。
            </p>
            <p>
              勝敗が確定したら、配当額を4択の中から選んで答えます。
            </p>
          </div>
        )}
      </main>
    )
  }

  return (
    <main>
      <h1 className={styles.mainHeading}>Baccarat</h1>
      <div className={styles.topButtons}>
        <button type="button" className={styles.button} onClick={() => setScreen('title')}>
          タイトルへ戻る
        </button>
        <button
          type="button"
          className={styles.button}
          aria-expanded={showCheatSheet}
          onClick={() => setShowCheatSheet((prev) => !prev)}
        >
          第三カードルール表
        </button>
        {showCheatSheet && (
          <section className={styles.panel}>
            <h2>第三カードルール表</h2>
            <div className={styles.tableScroll}>
              <table className={styles.ruleTable}>
                <thead>
                  <tr>
                    <th className={styles.ruleCorner} colSpan={2} rowSpan={2}>
                      3枚目のカード条件ルール
                    </th>
                    <th className={styles.ruleAxisLabel} colSpan={10}>
                      プレイヤー / 最初の2枚のカードの合計が以下の場合
                    </th>
                  </tr>
                  <tr>
                    {Array.from({ length: 10 }, (_, n) => (
                      <th key={n} className={styles.ruleHeaderCell}>
                        {n}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th className={styles.ruleAxisLabelVertical} rowSpan={10}>
                      バンカー / 最初の2枚のカードの合計が右の場合
                    </th>
                    <th className={styles.ruleHeaderCell}>0</th>
                    <td className={`${styles.ruleCell} ${styles.ruleCellDraw}`} colSpan={6} rowSpan={3}>
                      プレイヤー/バンカーともに3枚目のカードを引く
                    </td>
                    <td className={`${styles.ruleCell} ${styles.ruleCellDraw}`} colSpan={2} rowSpan={6}>
                      バンカーのみ3枚目のカードを引く
                    </td>
                    <td className={`${styles.ruleCell} ${styles.ruleCellWin}`} colSpan={2} rowSpan={8}>
                      プレイヤーの勝ち
                    </td>
                  </tr>
                  <tr>
                    <th className={styles.ruleHeaderCell}>1</th>
                  </tr>
                  <tr>
                    <th className={styles.ruleHeaderCell}>2</th>
                  </tr>
                  <tr>
                    <th className={styles.ruleHeaderCell}>3</th>
                    <td className={`${styles.ruleCell} ${styles.ruleCellNote}`} colSpan={3} rowSpan={4}>
                      プレイヤーの3枚目のカードが次の場合はバンカーも3枚目のカードを引く
                    </td>
                    <td className={`${styles.ruleCell} ${styles.ruleCellDraw}`} colSpan={3}>
                      0,1,2,3,4,5,6,7,9
                    </td>
                  </tr>
                  <tr>
                    <th className={styles.ruleHeaderCell}>4</th>
                    <td className={`${styles.ruleCell} ${styles.ruleCellDraw}`} colSpan={3}>
                      2,3,4,5,6,7
                    </td>
                  </tr>
                  <tr>
                    <th className={styles.ruleHeaderCell}>5</th>
                    <td className={`${styles.ruleCell} ${styles.ruleCellDraw}`} colSpan={3}>
                      4,5,6,7
                    </td>
                  </tr>
                  <tr>
                    <th className={styles.ruleHeaderCell}>6</th>
                    <td className={`${styles.ruleCell} ${styles.ruleCellDraw}`} colSpan={3}>
                      6,7
                    </td>
                    <td className={`${styles.ruleCell} ${styles.ruleCellTie}`}>引き分け</td>
                    <td className={`${styles.ruleCell} ${styles.ruleCellWin}`}>プレイヤーの勝ち</td>
                  </tr>
                  <tr>
                    <th className={styles.ruleHeaderCell}>7</th>
                    <td className={`${styles.ruleCell} ${styles.ruleCellDraw}`} colSpan={6}>
                      プレイヤーのみ3枚目のカードを引く
                    </td>
                    <td className={`${styles.ruleCell} ${styles.ruleCellLose}`}>バンカーの勝ち</td>
                    <td className={`${styles.ruleCell} ${styles.ruleCellTie}`}>引き分け</td>
                  </tr>
                  <tr>
                    <th className={styles.ruleHeaderCell}>8</th>
                    <td className={`${styles.ruleCell} ${styles.ruleCellLose}`} colSpan={8} rowSpan={2}>
                      バンカーの勝ち
                    </td>
                    <td className={`${styles.ruleCell} ${styles.ruleCellTie}`}>引き分け</td>
                    <td className={`${styles.ruleCell} ${styles.ruleCellWin}`}>プレイヤーの勝ち</td>
                  </tr>
                  <tr>
                    <th className={styles.ruleHeaderCell}>9</th>
                    <td className={`${styles.ruleCell} ${styles.ruleCellLose}`}>バンカーの勝ち</td>
                    <td className={`${styles.ruleCell} ${styles.ruleCellTie}`}>引き分け</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}
        <button type="button" className={styles.button} onClick={handleNextHand}>
          次のハンドへ
        </button>
      </div>
      {dealPhase === 'betting' && (
        <section>
          <h2 className={styles.sceneHeading}>ベット受付中</h2>
          <p>
            今回のベット: {BET_TYPE_LABEL[bet.type]} ${bet.amount}
          </p>
          <div className={styles.bettingLayout}>
            <svg
              className={styles.bettingArt}
              viewBox="0 0 300 460"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
            >
              <line x1="10" y1="30" x2="70" y2="30" className={styles.artLine} />
              <line x1="230" y1="30" x2="290" y2="30" className={styles.artLine} />
              <line x1="106" y1="30" x2="134" y2="30" className={styles.artLine} />
              <line x1="166" y1="30" x2="194" y2="30" className={styles.artLine} />
              <rect
                x="86"
                y="26"
                width="8"
                height="8"
                transform="rotate(45 90 30)"
                className={styles.artLine}
                fill="none"
              />
              <rect
                x="206"
                y="26"
                width="8"
                height="8"
                transform="rotate(45 210 30)"
                className={styles.artLine}
                fill="none"
              />
              <circle cx="150" cy="30" r="16" className={styles.artLine} fill="none" />
              <circle cx="150" cy="30" r="8" className={styles.artLine} fill="none" />
              <line x1="150" y1="6" x2="150" y2="16" className={styles.artLine} />
              <line x1="150" y1="44" x2="150" y2="54" className={styles.artLine} />
              <rect x="55" y="70" width="95" height="55" className={styles.artLine} fill="none" />
              <rect x="150" y="70" width="95" height="55" className={styles.artLine} fill="none" />
              <path
                d="M55,125 L55,245 C55,315 90,365 150,395 C210,365 245,315 245,245 L245,125 Z"
                className={styles.artLine}
                fill="none"
              />
              <path d="M55,235 Q150,265 245,235" className={styles.artLine} fill="none" />
              <circle cx="150" cy="250" r="30" className={styles.artLine} fill="#0f4d30" />
              <circle cx="150" cy="395" r="18" className={styles.artLine} fill="#0f4d30" />
            </svg>
            {BET_SPOT_ORDER.map((type) => (
              <div
                key={type}
                className={`${styles.betLabel} ${styles[`betLabel_${type}`]} ${
                  type === bet.type ? styles.betLabelActive : ''
                }`}
              >
                <span>{BET_TYPE_LABEL[type]}</span>
                {type === bet.type && <span className={styles.betChip} aria-hidden="true" />}
              </div>
            ))}
            <div className={styles.seatNumber} aria-hidden="true">
              1
            </div>
          </div>
        </section>
      )}
      <section className={`${styles.panel} ${styles.scoreFixed}`}>
        <div className={styles.scoreHeader}>
          <h2>スコア</h2>
          <button
            type="button"
            className={styles.button}
            aria-expanded={showScore}
            onClick={() => setShowScore((prev) => !prev)}
          >
            {showScore ? '閉じる' : '開く'}
          </button>
        </div>
        {showScore && (
          <>
            <ul>
              <li>Player Draw/Stand: {accuracyPercent(playerStats)}%</li>
              <li>Banker Draw/Stand: {accuracyPercent(bankerStats)}%</li>
              <li>勝敗判定: {accuracyPercent(outcomeStats)}%</li>
              <li>配当計算: {accuracyPercent(payoutStats)}%</li>
              <li>
                全体:{' '}
                {accuracyPercent(
                  combineStats(playerStats, bankerStats, outcomeStats, payoutStats),
                )}
                %
              </li>
            </ul>
            <button type="button" className={styles.button} onClick={handleResetScore}>
              スコアをリセット
            </button>
          </>
        )}
      </section>
      {dealPhase === 'answering' && (
        <>
      <p>
        今回のベット: {BET_TYPE_LABEL[bet.type]} ${bet.amount}
      </p>
      {revealStep < 4 && <h2 className={styles.sceneHeading}>カード配布中</h2>}
      <div className={styles.dealingLayout}>
        <svg
          className={styles.dealingArt}
          viewBox="0 0 400 210"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <rect x="15" y="15" width="180" height="180" rx="18" className={styles.artLine} fill="none" />
          <rect x="22" y="22" width="166" height="166" rx="14" className={styles.playerBox} />
          <rect x="205" y="15" width="180" height="180" rx="18" className={styles.artLine} fill="none" />
          <rect x="212" y="22" width="166" height="166" rx="14" className={styles.bankerBox} />
          <line x1="198" y1="15" x2="198" y2="195" className={styles.artLine} />
          <line x1="202" y1="15" x2="202" y2="195" className={styles.artLine} />
          <circle cx="200" cy="105" r="16" className={styles.artLine} fill="#0f4d30" />
          <rect x="36" y="60" width="52" height="52" rx="8" className={styles.artLine} fill="none" />
          <rect x="122" y="60" width="52" height="52" rx="8" className={styles.artLine} fill="none" />
          <rect x="79" y="136" width="52" height="50" rx="8" className={styles.artLine} fill="none" />
          <rect x="226" y="60" width="52" height="52" rx="8" className={styles.artLine} fill="none" />
          <rect x="312" y="60" width="52" height="52" rx="8" className={styles.artLine} fill="none" />
          <rect x="269" y="136" width="52" height="50" rx="8" className={styles.artLine} fill="none" />
        </svg>
        <span
          className={`${styles.dealBoxGlow} ${styles.dealBoxGlow_player} ${
            answerStep === 'player' && revealStep >= 4 ? styles.dealBoxGlowActive : ''
          }`}
          aria-hidden="true"
        />
        <span
          className={`${styles.dealBoxGlow} ${styles.dealBoxGlow_banker} ${
            answerStep === 'banker' ? styles.dealBoxGlowActive : ''
          }`}
          aria-hidden="true"
        />
        <span className={`${styles.dealTitle} ${styles.dealTitle_player}`}>Player</span>
        <span className={`${styles.dealTitle} ${styles.dealTitle_banker}`}>Banker</span>
        <span className={`${styles.dealSlotNum} ${styles.dealSlotNum_player1}`}>1</span>
        <span className={`${styles.dealSlotNum} ${styles.dealSlotNum_player2}`}>2</span>
        <span className={`${styles.dealSlotNum} ${styles.dealSlotNum_player3}`}>3</span>
        <span className={`${styles.dealSlotNum} ${styles.dealSlotNum_banker1}`}>1</span>
        <span className={`${styles.dealSlotNum} ${styles.dealSlotNum_banker2}`}>2</span>
        <span className={`${styles.dealSlotNum} ${styles.dealSlotNum_banker3}`}>3</span>
        <HandCards
          cards={playerAnswer === null ? playerInitialCards : hand.player}
          handType="player"
          dealStep={dealStep}
          revealStep={revealStep}
        />
        <HandCards
          cards={bankerAnswer === null ? bankerInitialCards : hand.banker}
          handType="banker"
          dealStep={dealStep}
          revealStep={revealStep}
        />
      </div>
      {answerStep === 'player' && revealStep >= 4 && (
        <div className={styles.answerPrompt}>
          <p className={styles.answerPromptLabel}>Playerの判断: Draw する? Stand する?</p>
          <div className={styles.buttonRow}>
            <button type="button" className={styles.button} onClick={() => handlePlayerAnswer('draw')}>
              Draw
            </button>
            <button type="button" className={styles.button} onClick={() => handlePlayerAnswer('stand')}>
              Stand
            </button>
          </div>
        </div>
      )}
      {playerAnswer !== null && (
        <p aria-live="polite">{playerAnswer === correctPlayerAnswer ? '正解' : '不正解'}</p>
      )}
      {playerAnswer !== null && playerAnswer !== correctPlayerAnswer && (
        <p>
          正解: {correctPlayerAnswer === 'draw' ? 'Draw' : 'Stand'}(
          {formatPlayerReason(playerInitialScore)})
        </p>
      )}
      {answerStep === 'banker' && (
        <div className={styles.answerPrompt}>
          <p className={styles.answerPromptLabel}>Bankerの判断: Draw する? Stand する?</p>
          <div className={styles.buttonRow}>
            <button type="button" className={styles.button} onClick={() => handleBankerAnswer('draw')}>
              Draw
            </button>
            <button type="button" className={styles.button} onClick={() => handleBankerAnswer('stand')}>
              Stand
            </button>
          </div>
        </div>
      )}
      {bankerAnswer !== null && (
        <p aria-live="polite">{bankerAnswer === correctBankerAnswer ? '正解' : '不正解'}</p>
      )}
      {bankerAnswer !== null && bankerAnswer !== correctBankerAnswer && (
        <p>
          正解: {correctBankerAnswer === 'draw' ? 'Draw' : 'Stand'}(
          {formatBankerReason(bankerInitialScore, playerDrew, playerThirdCardValue)})
        </p>
      )}
      {answerStep === 'outcome' && (
        <div className={styles.buttonRow}>
          <button type="button" className={styles.button} onClick={() => handleOutcomeAnswer('player')}>
            Player win
          </button>
          <button type="button" className={styles.button} onClick={() => handleOutcomeAnswer('banker')}>
            Banker win
          </button>
          <button type="button" className={styles.button} onClick={() => handleOutcomeAnswer('tie')}>
            Tie
          </button>
        </div>
      )}
      {outcomeAnswer !== null && (
        <p aria-live="polite">{outcomeAnswer === correctOutcome ? '正解' : '不正解'}</p>
      )}
      {outcomeAnswer !== null && outcomeAnswer !== correctOutcome && (
        <p>
          正解: {OUTCOME_LABEL[correctOutcome]}(
          {formatOutcomeReason(finalPlayerScore, finalBankerScore)})
        </p>
      )}
      {answerStep === 'payout' && (
        <div className={styles.buttonRow}>
          {payoutChoices.map((choice) => (
            <button
              key={choice}
              type="button"
              className={styles.button}
              onClick={() => handlePayoutAnswer(choice)}
            >
              ${choice}
            </button>
          ))}
        </div>
      )}
      {payoutAnswer !== null && (
        <p aria-live="polite">{payoutAnswer === correctPayout ? '正解' : '不正解'}</p>
      )}
      {payoutAnswer !== null && payoutAnswer !== correctPayout && (
        <p>
          正解: ${correctPayout}(
          {formatPayoutReason(bet, correctOutcome, playerPair, bankerPair)})
        </p>
      )}
      {answerStep === 'done' && (
        <section className={styles.outcome}>
          <h2>支払い結果</h2>
          <p>{OUTCOME_LABEL[correctOutcome]}</p>
          <p>配当: ${correctPayout}</p>
        </section>
      )}
        </>
      )}
    </main>
  )
}

export default App
