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

const OUTCOME_LABEL: Record<Outcome, string> = {
  player: 'Player win',
  banker: 'Banker win',
  tie: 'Tie',
}

type DrawStandAnswer = 'draw' | 'stand'
type DealPhase = 'betting' | 'dealing' | 'answering'
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

function PlayingCard({ card, faceUp, dealAnimate }: { card: Card; faceUp: boolean; dealAnimate?: boolean }) {
  const innerClassNames = [styles.flipCardInner, faceUp ? styles.isFlipped : '']
    .filter(Boolean)
    .join(' ')
  const frontClassNames = [styles.flipCardFront, isRedSuit(card.suit) ? styles.cardRed : styles.cardBlack].join(' ')
  const outerClassNames = [styles.flipCard, dealAnimate ? styles.dealAnimation : ''].filter(Boolean).join(' ')
  return (
    <span className={outerClassNames}>
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
    <span className={styles.cardRow}>
      {cards.map((card, index) => {
        const seqIndex = initialDealSeqIndex(handType, index)
        if (seqIndex === null) {
          return <PlayingCard key={index} card={card} faceUp dealAnimate />
        }
        if (dealStep <= seqIndex) return null
        return <PlayingCard key={index} card={card} faceUp={revealStep > seqIndex} dealAnimate />
      })}
    </span>
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
  const [showScore, setShowScore] = useState(true)
  const [dealPhase, setDealPhase] = useState<DealPhase>('betting')
  const [answerStep, setAnswerStep] = useState<AnswerStep>('player')
  const [dealStep, setDealStep] = useState(0)
  const [revealStep, setRevealStep] = useState(0)

  useEffect(() => {
    if (dealPhase === 'answering') return
    const nextPhase: DealPhase = dealPhase === 'betting' ? 'dealing' : 'answering'
    const timer = setTimeout(() => setDealPhase(nextPhase), DEAL_PHASE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [dealPhase])

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
      <main>
        <h1>バカラディーラー判断練習</h1>
        <button type="button" className={styles.button} onClick={() => setScreen('main')}>
          はじめる
        </button>
      </main>
    )
  }

  return (
    <main>
      <h1>baccarat</h1>
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
      {dealPhase === 'betting' && (
        <section>
          <h2>ベット受付中</h2>
          <p>
            今回のベット: {BET_TYPE_LABEL[bet.type]} ${bet.amount}
          </p>
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
      {dealPhase === 'dealing' && (
        <section>
          <h2>カード配布中</h2>
          <p>
            今回のベット: {BET_TYPE_LABEL[bet.type]} ${bet.amount}
          </p>
        </section>
      )}
      {dealPhase === 'answering' && (
        <>
      <p>
        今回のベット: {BET_TYPE_LABEL[bet.type]} ${bet.amount}
      </p>
      <div className={styles.table}>
        <section
          className={`${styles.hand} ${answerStep === 'player' && revealStep >= 4 ? styles.activeHand : ''}`}
        >
          <h2>Player</h2>
          <HandCards
            cards={playerAnswer === null ? playerInitialCards : hand.player}
            handType="player"
            dealStep={dealStep}
            revealStep={revealStep}
          />
        </section>
        <section className={`${styles.hand} ${answerStep === 'banker' ? styles.activeHand : ''}`}>
          <h2>Banker</h2>
          <HandCards
            cards={bankerAnswer === null ? bankerInitialCards : hand.banker}
            handType="banker"
            dealStep={dealStep}
            revealStep={revealStep}
          />
        </section>
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
