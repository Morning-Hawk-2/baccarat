import { useMemo, useState } from 'react'
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

interface Stats {
  correct: number
  total: number
}

const INITIAL_STATS: Stats = { correct: 0, total: 0 }

function accuracyPercent(stats: Stats): number {
  if (stats.total === 0) return 0
  return Math.round((stats.correct / stats.total) * 100)
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

function App() {
  const [hand, setHand] = useState<DealtHand>(() => dealRandomHand())
  const [bet, setBet] = useState<Bet>(() => generateRandomBet())
  const [playerAnswer, setPlayerAnswer] = useState<DrawStandAnswer | null>(null)
  const [bankerAnswer, setBankerAnswer] = useState<DrawStandAnswer | null>(null)
  const [outcomeAnswer, setOutcomeAnswer] = useState<Outcome | null>(null)
  const [payoutAnswer, setPayoutAnswer] = useState<number | null>(null)
  const [playerStats, setPlayerStats] = useState<Stats>(INITIAL_STATS)
  const [bankerStats, setBankerStats] = useState<Stats>(INITIAL_STATS)

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

  const handleNextHand = () => {
    setHand(dealRandomHand())
    setBet(generateRandomBet())
    setPlayerAnswer(null)
    setBankerAnswer(null)
    setOutcomeAnswer(null)
    setPayoutAnswer(null)
  }

  return (
    <div>
      <h1>baccarat</h1>
      <button type="button" onClick={handleNextHand}>
        次のハンドへ
      </button>
      <p>
        今回のベット: {BET_TYPE_LABEL[bet.type]} ${bet.amount}
      </p>
      <section>
        <h2>スコア</h2>
        <ul>
          <li>Player Draw/Stand: {accuracyPercent(playerStats)}%</li>
          <li>Banker Draw/Stand: {accuracyPercent(bankerStats)}%</li>
          <li>勝敗判定: 0%</li>
          <li>配当計算: 0%</li>
          <li>全体: 0%</li>
        </ul>
      </section>
      <section>
        <h2>Player</h2>
        <p>
          {(playerAnswer === null ? playerInitialCards : hand.player).map(formatCard).join(' ')}
        </p>
      </section>
      <section>
        <h2>Banker</h2>
        <p>
          {(bankerAnswer === null ? bankerInitialCards : hand.banker).map(formatCard).join(' ')}
        </p>
      </section>
      <div>
        <button type="button" onClick={() => handlePlayerAnswer('draw')}>
          Draw
        </button>
        <button type="button" onClick={() => handlePlayerAnswer('stand')}>
          Stand
        </button>
      </div>
      {playerAnswer !== null && (
        <p>{playerAnswer === correctPlayerAnswer ? '正解' : '不正解'}</p>
      )}
      {playerAnswer !== null && playerAnswer !== correctPlayerAnswer && (
        <p>
          正解: {correctPlayerAnswer === 'draw' ? 'Draw' : 'Stand'}(
          {formatPlayerReason(playerInitialScore)})
        </p>
      )}
      {playerAnswer !== null && (
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
      {bankerAnswer !== null && (
        <div>
          <button type="button" onClick={() => setOutcomeAnswer('player')}>
            Player win
          </button>
          <button type="button" onClick={() => setOutcomeAnswer('banker')}>
            Banker win
          </button>
          <button type="button" onClick={() => setOutcomeAnswer('tie')}>
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
      {outcomeAnswer !== null && (
        <div>
          {payoutChoices.map((choice) => (
            <button key={choice} type="button" onClick={() => setPayoutAnswer(choice)}>
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
    </div>
  )
}

export default App
