const fs = require('fs');

function randomNumber(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);

  return Math.floor(Math.random() * (max - min + 1) + min);
}

const cardsFileTextContent = fs.readFileSync('./cards.json', 'utf-8');
const cards = JSON.parse(cardsFileTextContent);
const tags = ['default', 'expansion_1', 'expansion_2'];

for (const card of cards) {
  card.card_type = tags[randomNumber(0, tags.length - 1)];
}

fs.writeFileSync('./cards.json', JSON.stringify(cards, null, '\t'));
