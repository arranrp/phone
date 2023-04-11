if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/js/serviceWorker.js');
    } catch (error) {
      console.error(error);
    }
  });
}

const isRunningLocally = ['127.0.0.1', 'localhost'].includes(location.hostname);

const randomNumber = (min, max) =>
  Math.floor(Math.random() * (max - min + 1) + min);

document.addEventListener('alpine:init', () => {
  Alpine.store('peer', '');
  Alpine.store('dataConnection', '');
  Alpine.store('isCreatingGame', false);
  Alpine.store('gameCreatorConfig', { tallySize: 8 });

  Alpine.data('home', () => ({
    canCreatePeer: false,
    idOfGameToJoin: '',
    accessKey: '',
    createGame(mode) {
      this.$store.isCreatingGame = true;
      this.$store.gameCreatorConfig.tallySize = mode === 'quick' ? 8 : 16;
      this.canCreatePeer = true;
    },
    joinGame() {
      this.canCreatePeer = true;
    },
    init() {
      this.$watch('canCreatePeer', (isFlagSet) => {
        if (!isFlagSet) return;

        this.$store.peer = new Peer(null, {
          key: this.accessKey,
          host: isRunningLocally ? '127.0.0.1' : 'imd-peer-server.onrender.com',
          port: isRunningLocally ? 9000 : 443,
          secure: !isRunningLocally
        });

        this.$store.peer.on('error', (err) => {
          console.error(err);

          if (err.message === 'Invalid key provided') {
            alert('Invalid Access Key');
          }

          this.canCreatePeer = false;
        });

        this.$store.peer.on('open', (peerId) => {
          const gameId = this.$store.isCreatingGame
            ? peerId
            : this.idOfGameToJoin;

          this.$router.push(`/game/${gameId}`);
        });
      });
    }
  }));

  Alpine.data('cardGame', () => ({
    isInitialisingGameState: true,
    isFetchingCards: false,
    cardsFetchErrorOccurred: false,
    gameStateUpdate: {},
    gameState: {
      allCards: [],
      remainingCards: [],
      currentCard: null,
      isOver: false,
      guestPickedTheirFirstCard: false
    },
    get isGameHost() {
      return this.$store.peer.id === this.$router.params.gameId;
    },
    pickRandomCardFrom(tally) {
      const randomCardIndex = randomNumber(0, tally.length - 1);

      this.gameState.currentCard = tally[randomCardIndex];
      this.gameState.remainingCards = tally.filter(
        ({ id }) => id !== this.gameState.currentCard.id
      );

      if (!this.isInitialisingGameState) {
        this.gameStateUpdate = {
          guestPickedFirstCard: this.gameState.guestPickedTheirFirstCard,
          isOver: this.gameState.isOver,
          remainingCards: this.gameState.remainingCards
        };
      }
    },
    async fetchCardsAndStartGame() {
      try {
        const cards = await (await fetch('/cards.json')).json();
        const defaultCards = cards.filter(
          ({ card_type }) => card_type === 'default'
        );
        const tally = [];

        for (let i = 0; i < this.$store.gameCreatorConfig.tallySize; i++) {
          const randomCardIndex = randomNumber(0, defaultCards.length - 1);
          const [randomCard] = defaultCards.splice(randomCardIndex, 1);
          tally.push(randomCard);
        }

        this.gameState.allCards = tally;
        this.pickRandomCardFrom(this.gameState.allCards);
      } catch (error) {
        console.error(error);
        this.cardsFetchErrorOccurred = true;
      } finally {
        this.isFetchingCards = false;
        this.isInitialisingGameState = false;
      }
    },
    pickNextCardOrFinish() {
      if (this.gameState.remainingCards.length > 0) {
        this.pickRandomCardFrom(this.gameState.remainingCards);
      } else {
        this.gameState.isOver = true;
        this.gameStateUpdate = { isOver: this.gameState.isOver };
      }
    },
    restartGame() {
      this.gameState.isOver = false;
      this.gameState.guestPickedTheirFirstCard = false;
      this.pickRandomCardFrom(this.gameState.allCards);
    },
    async init() {
      if (this.$store.isCreatingGame) {
        this.$store.peer.on('connection', (dataConn) => {
          dataConn.on('open', () => {
            dataConn.send(JSON.parse(JSON.stringify(this.gameState)));

            dataConn.on('data', (data) => {
              this.gameState = { ...this.gameState, ...data };
            });
          });

          this.$watch('gameStateUpdate', (stateUpdate) => {
            dataConn.send(JSON.parse(JSON.stringify(stateUpdate)));
          });
        });

        this.$store.isCreatingGame = false;
        this.isFetchingCards = true;
        await this.fetchCardsAndStartGame();
      } else {
        const dataConn = this.$store.peer.connect(this.$router.params.gameId, {
          serialization: 'json'
        });

        dataConn.on('open', () => {
          dataConn.on('data', (data) => {
            this.isInitialisingGameState = false;
            this.gameState = { ...this.gameState, ...data };

            if (!this.gameState.guestPickedTheirFirstCard) {
              this.gameState.guestPickedTheirFirstCard = true;
              this.pickRandomCardFrom(this.gameState.remainingCards);
            }
          });
        });

        this.$watch('gameStateUpdate', (stateUpdate) => {
          dataConn.send(JSON.parse(JSON.stringify(stateUpdate)));
        });
      }

      window.onbeforeunload = () => {
        this.$store.peer.destroy();
      };
    }
  }));
});
