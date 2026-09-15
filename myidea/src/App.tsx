import { useMemo, useState } from 'react'
import { generateAnswerChoices } from './baccarat/answerChoices'
import type { Bet } from './baccarat/bet'
import { generateRandomBet } from './baccarat/bet'
import type { DealtHand } from './baccarat/dealHand'
import type { Outcome } from './baccarat/outcome'
import { judgeOutcome } from './baccarat/outcome'
import { isPair } from './baccarat/pair'
import { calculatePayout } from './baccarat/payout'
import { dealRandomHand } from './baccarat/randomHand'
import type { Card, Suit } from './baccarat/score'

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

type DrawStandAnswer = 'draw' | 'stand'

function formatCard(card: Card): string {
  return card.suit ? `${card.rank}${SUIT_SYMBOLS[card.suit]}` : card.rank
}

function App() {
  const [hand, setHand] = useState<DealtHand>(() => dealRandomHand())
  const [bet, setBet] = useState<Bet>(() => generateRandomBet())
  const [playerAnswer, setPlayerAnswer] = useState<DrawStandAnswer | null>(null)
  const [bankerAnswer, setBankerAnswer] = useState<DrawStandAnswer | null>(null)
  const [outcomeAnswer, setOutcomeAnswer] = useState<Outcome | null>(null)
  const [payoutAnswer, setPayoutAnswer] = useState<number | null>(null)

  const playerInitialCards = hand.player.slice(0, 2)
  const bankerInitialCards = hand.banker.slice(0, 2)
  const correctPlayerAnswer: DrawStandAnswer = hand.player.length > 2 ? 'draw' : 'stand'
  const correctBankerAnswer: DrawStandAnswer = hand.banker.length > 2 ? 'draw' : 'stand'
  const correctOutcome = judgeOutcome(hand.player, hand.banker)
  const correctPayout = calculatePayout(bet, {
    outcome: correctOutcome,
    playerPair: isPair([hand.player[0], hand.player[1]]),
    bankerPair: isPair([hand.banker[0], hand.banker[1]]),
  })
  const payoutChoices = useMemo(() => generateAnswerChoices(correctPayout), [hand, bet])

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
        <button type="button" onClick={() => setPlayerAnswer('draw')}>
          Draw
        </button>
        <button type="button" onClick={() => setPlayerAnswer('stand')}>
          Stand
        </button>
      </div>
      {playerAnswer !== null && (
        <p>{playerAnswer === correctPlayerAnswer ? '正解' : '不正解'}</p>
      )}
      {playerAnswer !== null && (
        <div>
          <button type="button" onClick={() => setBankerAnswer('draw')}>
            Draw
          </button>
          <button type="button" onClick={() => setBankerAnswer('stand')}>
            Stand
          </button>
        </div>
      )}
      {bankerAnswer !== null && (
        <p>{bankerAnswer === correctBankerAnswer ? '正解' : '不正解'}</p>
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
    </div>
  )
}

export default App
