if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker has been registered!');
    } catch (error) {
      console.error(error);
    }
  });
}

const randomNumber = (min, max) =>
  Math.floor(Math.random() * (max - min + 1) + min);

document.addEventListener('alpine:init', () => {
  Alpine.data('cardGame', () => ({
    isFetchingCards: true,
    fetchErrorOccurred: false,
    globalTally: [], // All available cards
    currentGameTally: [], // Cards that are yet to be picked in this game
    currentCard: null,
    gameOver: false,
    pickRandomCardFrom(tally) {
      const randomCardIndex = randomNumber(0, tally.length - 1);

      this.currentCard = tally[randomCardIndex];
      this.currentGameTally = tally.filter(
        ({ id }) => id !== this.currentCard.id
      );
    },
    async fetchCardsAndStartGame() {
      try {
        this.isFetchingCards = true;
        this.fetchErrorOccurred = false;

        const allCards = await (await fetch('/cards.json')).json();
        const defaultCards = allCards.filter(
          ({ card_type }) => card_type === 'default'
        );

        const tally = [];
        const tallySize = this.$router.query.mode === 'quick' ? 8 : 16;

        for (let i = 0; i < tallySize; i++) {
          const randomCardIndex = randomNumber(0, defaultCards.length - 1);
          tally.push(...defaultCards.splice(randomCardIndex, 1));
        }

        this.globalTally = tally;
        this.pickRandomCardFrom(this.globalTally);
      } catch (error) {
        console.error(error);
        this.fetchErrorOccurred = true;
      } finally {
        this.isFetchingCards = false;
      }
    },
    pickNextCardOrFinish() {
      if (this.currentGameTally.length > 0) {
        this.pickRandomCardFrom(this.currentGameTally);
      } else {
        this.gameOver = true;
      }
    },
    restartGame() {
      this.pickRandomCardFrom(this.globalTally);
      this.gameOver = false;
    }
  }));
});
