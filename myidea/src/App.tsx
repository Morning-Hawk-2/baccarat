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

function formatCard(card: Card): string {
  return card.suit ? `${card.rank}${SUIT_SYMBOLS[card.suit]}` : card.rank
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

const BANKER_DRAW_TABLE: { bankerScore: number; drawsWhenPlayerThirdCardIs: string }[] = [
  { bankerScore: 3, drawsWhenPlayerThirdCardIs: '0-7, 9(8以外)' },
  { bankerScore: 4, drawsWhenPlayerThirdCardIs: '2-7' },
  { bankerScore: 5, drawsWhenPlayerThirdCardIs: '4-7' },
  { bankerScore: 6, drawsWhenPlayerThirdCardIs: '6-7' },
]

function App() {
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
  const [dealPhase, setDealPhase] = useState<DealPhase>('betting')
  const [answerStep, setAnswerStep] = useState<AnswerStep>('player')

  useEffect(() => {
    if (dealPhase === 'answering') return
    const nextPhase: DealPhase = dealPhase === 'betting' ? 'dealing' : 'answering'
    const timer = setTimeout(() => setDealPhase(nextPhase), DEAL_PHASE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [dealPhase])

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
  }

  const handleResetScore = () => {
    if (!window.confirm('スコアをリセットしますか?')) return
    setPlayerStats(INITIAL_STATS)
    setBankerStats(INITIAL_STATS)
    setOutcomeStats(INITIAL_STATS)
    setPayoutStats(INITIAL_STATS)
  }

  return (
    <div>
      <h1>baccarat</h1>
      <button type="button" onClick={() => setShowCheatSheet((prev) => !prev)}>
        第三カードルール表
      </button>
      {showCheatSheet && (
        <section>
          <h2>第三カードルール表</h2>
          <h3>Player</h3>
          <ul>
            <li>0-5: 引く</li>
            <li>6-7: 止める</li>
            <li>8-9: ナチュラル(引かない)</li>
          </ul>
          <h3>Banker(Playerが止めた場合)</h3>
          <ul>
            <li>0-5: 引く</li>
            <li>6-7: 止める</li>
            <li>8-9: ナチュラル(引かない)</li>
          </ul>
          <h3>Banker(Playerが第三カードを引いた場合)</h3>
          <table>
            <thead>
              <tr>
                <th>Banker点数</th>
                <th>引くPlayer第三カード</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>0-2</td>
                <td>常に引く</td>
              </tr>
              {BANKER_DRAW_TABLE.map((row) => (
                <tr key={row.bankerScore}>
                  <td>{row.bankerScore}</td>
                  <td>{row.drawsWhenPlayerThirdCardIs}</td>
                </tr>
              ))}
              <tr>
                <td>7</td>
                <td>常に止める</td>
              </tr>
              <tr>
                <td>8-9</td>
                <td>ナチュラル(引かない)</td>
              </tr>
            </tbody>
          </table>
        </section>
      )}
      <button type="button" onClick={handleNextHand}>
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
      {dealPhase === 'dealing' && (
        <section>
          <h2>カード配布中</h2>
          <p>
            今回のベット: {BET_TYPE_LABEL[bet.type]} ${bet.amount}
          </p>
          <p>Player: {playerInitialCards.map(formatCard).join(' ')}</p>
          <p>Banker: {bankerInitialCards.map(formatCard).join(' ')}</p>
        </section>
      )}
      <section>
        <h2>スコア</h2>
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
        <button type="button" onClick={handleResetScore}>
          スコアをリセット
        </button>
      </section>
      {dealPhase === 'answering' && (
        <>
      <p>
        今回のベット: {BET_TYPE_LABEL[bet.type]} ${bet.amount}
      </p>
      <div className={styles.table}>
        <section className={styles.hand}>
          <h2>Player</h2>
          <p className={styles.cards}>
            {(playerAnswer === null ? playerInitialCards : hand.player).map(formatCard).join(' ')}
          </p>
        </section>
        <section className={styles.hand}>
          <h2>Banker</h2>
          <p className={styles.cards}>
            {(bankerAnswer === null ? bankerInitialCards : hand.banker).map(formatCard).join(' ')}
          </p>
        </section>
      </div>
      {answerStep === 'player' && (
        <div>
          <button type="button" onClick={() => handlePlayerAnswer('draw')}>
            Draw
          </button>
          <button type="button" onClick={() => handlePlayerAnswer('stand')}>
            Stand
          </button>
        </div>
      )}
      {playerAnswer !== null && (
        <p>{playerAnswer === correctPlayerAnswer ? '正解' : '不正解'}</p>
      )}
      {playerAnswer !== null && playerAnswer !== correctPlayerAnswer && (
        <p>
          正解: {correctPlayerAnswer === 'draw' ? 'Draw' : 'Stand'}(
          {formatPlayerReason(playerInitialScore)})
        </p>
      )}
      {answerStep === 'banker' && (
        <div>
          <button type="button" onClick={() => handleBankerAnswer('draw')}>
            Draw
          </button>
          <button type="button" onClick={() => handleBankerAnswer('stand')}>
            Stand
          </button>
        </div>
      )}
      {bankerAnswer !== null && (
        <p>{bankerAnswer === correctBankerAnswer ? '正解' : '不正解'}</p>
      )}
      {bankerAnswer !== null && bankerAnswer !== correctBankerAnswer && (
        <p>
          正解: {correctBankerAnswer === 'draw' ? 'Draw' : 'Stand'}(
          {formatBankerReason(bankerInitialScore, playerDrew, playerThirdCardValue)})
        </p>
      )}
      {answerStep === 'outcome' && (
        <div>
          <button type="button" onClick={() => handleOutcomeAnswer('player')}>
            Player win
          </button>
          <button type="button" onClick={() => handleOutcomeAnswer('banker')}>
            Banker win
          </button>
          <button type="button" onClick={() => handleOutcomeAnswer('tie')}>
            Tie
          </button>
        </div>
      )}
      {outcomeAnswer !== null && (
        <p>{outcomeAnswer === correctOutcome ? '正解' : '不正解'}</p>
      )}
      {outcomeAnswer !== null && outcomeAnswer !== correctOutcome && (
        <p>
          正解: {OUTCOME_LABEL[correctOutcome]}(
          {formatOutcomeReason(finalPlayerScore, finalBankerScore)})
        </p>
      )}
      {answerStep === 'payout' && (
        <div>
          {payoutChoices.map((choice) => (
            <button key={choice} type="button" onClick={() => handlePayoutAnswer(choice)}>
              ${choice}
            </button>
          ))}
        </div>
      )}
      {payoutAnswer !== null && (
        <p>{payoutAnswer === correctPayout ? '正解' : '不正解'}</p>
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
    </div>
  )
}

export default App
