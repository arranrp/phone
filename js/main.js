function randomNumber(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min);
}

document.addEventListener('alpine:init', () => {
  Alpine.data('cardGame', () => ({
    isFetchingCards: true,
    fetchErrorOccurred: false,
    globalTally: [], // All the available cards
    currentGameTally: [], // Cards that are yet to be picked in this game
    currentCard: null,
    gameOver: false,
    pickRandomCardFrom(tally) {
      this.currentCard = tally[randomNumber(0, tally.length - 1)];
      this.currentGameTally = tally.filter(
        ({ id }) => id !== this.currentCard.id
      );
    },
    async fetchCardsAndStartGame() {
      try {
        this.isFetchingCards = true;
        this.fetchErrorOccurred = false;

        const cards = await (await fetch('./cards.json')).json();
        const tally = [];
        const tallySize = this.$router.query.mode === 'quick' ? 8 : 16;

        for (let i = 0; i <= tallySize; i++) {
          tally.push(...cards.splice(randomNumber(0, cards.length - 1), 1));
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
