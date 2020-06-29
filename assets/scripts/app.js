const attackValue = 10;
const strongAttackValue = 17;
const monsterAttackValue = 14;
const healValue = 20;

let chosenMaxLife = 100;
let currentMonsterHealth = chosenMaxLife;
let currentPlayerHealth = chosenMaxLife;
let hasBonusLife = true;

adjustHealthBars(chosenMaxLife);
function reset() {
  currentMonsterHealth = chosenMaxLife;
  currentPlayerHealth = chosenMaxLife;
  resetGame(chosenMaxLife);
}

function endRound() {
  const initialPlayerHealth = currentPlayerHealth;
  const playerDamage = dealPlayerDamage(monsterAttackValue);
  currentPlayerHealth -= playerDamage;

  if (currentPlayerHealth <= 0 && hasBonusLife) {
    hasBonusLife = false;
    removeBonusLife();
    currentPlayerHealth = initialPlayerHealth;
    setPlayerHealth(initialPlayerHealth);
    alert("you would be dead but the bonus life saved you!");
  }

  if (currentMonsterHealth <= 0 && currentPlayerHealth > 0) {
    alert("Player Won");
    reset();
  } else if (currentPlayerHealth <= 0 && currentMonsterHealth > 0) {
    alert("Monster Won");
    reset();
  } else if (currentPlayerHealth <= 0 && currentMonsterHealth <= 0) {
    alert("You have a draw!");
    reset();
  }
}
function attackMonster(attackValue) {
  const monsterDamage = dealMonsterDamage(attackValue);
  currentMonsterHealth -= monsterDamage;
  endRound();
}

function attackHandler(chosenMaxLife) {
  attackMonster(attackValue);
}
function strongAttackHandler(chosenMaxLife) {
  attackMonster(strongAttackValue);
}

function healPlayerHandler() {
  let maxhealthValue;
  if (currentPlayerHealth >= chosenMaxLife - healValue) {
    alert("you can't heal to more than your max initial health");
    maxhealthValue = chosenMaxLife - currentPlayerHealth;
  } else {
    maxhealthValue = healValue;
  }
  increasePlayerHealth(maxhealthValue);
  currentPlayerHealth += maxhealthValue;
  endRound();
}

attackBtn.addEventListener("click", attackHandler);
strongAttackBtn.addEventListener("click", strongAttackHandler);
healBtn.addEventListener("click", healPlayerHandler);
