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

        this.globalTally = cards.filter(
          ({ card_type }) => card_type === 'default'
        );
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
