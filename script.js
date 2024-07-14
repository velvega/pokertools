document.getElementById('start-game').addEventListener('click', setupGame);
document.getElementById('submit-names').addEventListener('click', startGame);
document.getElementById('place-bet').addEventListener('click', placeBet);
document.getElementById('call-bet').addEventListener('click', callBet);
document.getElementById('fold-bet').addEventListener('click', foldBet);
document.getElementById('check-bet').addEventListener('click', checkBet);
document.getElementById('next-turn').addEventListener('click', nextTurn);
document.getElementById('next-hand').addEventListener('click', nextHand);
document.getElementById('showdown').addEventListener('click', prepareShowdown);
document.getElementById('pot-award').addEventListener('click', awardPot);

let playerChips = []; // 各プレイヤーの持ち点を保持
let playerBetSize = []; // 各プレイヤーのベットサイズを保持
let players = [];
let currentHand = 1;
let totalPot = 0; // ハンド全体のポット
let mainPot = 0;
let sidePots = []; // サイドポットを保持する配列
let actionPlayerIndex = 0;
let btnIndex = 0;
let sbIndex = 1;
let bbIndex = 2;
let smallBlind = 0;
let bigBlind = 0;
let currentTurn = 'プリフロップ';
let actionHistory = [];

function setupGame() {
    const playerCount = document.getElementById('player-count').value;
    const initialChips = parseInt(document.getElementById('initial-chips').value);
    smallBlind = parseInt(document.getElementById('small-blind').value);
    bigBlind = parseInt(document.getElementById('big-blind').value);

    let nameInputsHTML = '';
    for (let i = 0; i < playerCount; i++) {
        nameInputsHTML += `<label for="player-name-${i}">プレイヤー${i + 1}:</label><input type="text" id="player-name-${i}"><br>`;
        players.push({ name: '', chips: initialChips, bet: 0, folded: false });
        playerChips.push(initialChips);
        playerBetSize.push(0);
    }
    document.getElementById('name-inputs').innerHTML = nameInputsHTML;

    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('name-input-screen').style.display = 'block';
}

function startGame() {
    console.log("startGame function triggered");
    players.forEach((player, index) => {
        player.name = document.getElementById(`player-name-${index}`).value;
    });

    // ポーカーテーブルの生成
    let tableHTML = '';
    const tableRadius = 200;
    const centerX = document.getElementById('table').clientWidth / 2;
    const centerY = document.getElementById('table').clientHeight / 2;
    players.forEach((player, index) => {
        const angle = (2 * Math.PI / players.length) * index;
        const x = centerX + tableRadius * Math.cos(angle) - 50;
        const y = centerY + tableRadius * Math.sin(angle) - 50;
        tableHTML += `<div class="player" id="player-${index}" style="left: ${x}px; top: ${y}px;">${player.name}<br>チップ: <span id="chips-${index}">${player.chips}</span><br>ベット: <span id="bet-${index}">0</span></div>`;
    });
    document.getElementById('table').innerHTML = tableHTML;

    // DOM要素の確認
    players.forEach((player, index) => {
        const playerElement = document.getElementById(`player-${index}`);
        console.log(`Player ${index} element:`, playerElement);
    });

    // 勝者選択プルダウンメニューの生成
    let winnerOptions = '';
    players.forEach((player, index) => {
        winnerOptions += `<option value="${index}">${player.name}</option>`;
    });
    document.getElementById('winner-select').innerHTML = winnerOptions;

    startNewHand();

    // 画面切り替え
    document.getElementById('name-input-screen').style.display = 'none';
    document.getElementById('game-area').style.display = 'flex';
    document.getElementById('game-screen').style.display = 'block';
    updateTable();
}

function startNewHand() {
    clearActionHistory();
    players.forEach((player, index) => {
        if (player.chips > 0) {
            player.bet = 0;
            player.folded = false;
            playerBetSize[index] = 0;
            const playerElement = document.getElementById(`player-${index}`);
            if (playerElement) {
                playerElement.classList.remove('folded', 'defeated', 'all-in');
            }
        } else {
            player.folded = true;
            const playerElement = document.getElementById(`player-${index}`);
            if (playerElement) {
                playerElement.classList.add('defeated');
            }
        }
    });
    resetBets();

    do {
        btnIndex = (btnIndex + 1) % players.length;
    } while (players[btnIndex].chips === 0);

    do {
        sbIndex = (sbIndex + 1) % players.length;
    } while (players[sbIndex].chips === 0);

    do {
        bbIndex = (bbIndex + 1) % players.length;
    } while (players[bbIndex].chips === 0);

    updateBlinds();

    totalPot = 0;
    if (players[sbIndex].chips > 0) {
        addBlindToTotalPot(sbIndex, smallBlind);
    }
    if (players[bbIndex].chips > 0) {
        addBlindToTotalPot(bbIndex, bigBlind);
    }
    updateChips();
    updatePot();

    setActionPlayerToUTG();
    highlightActionPlayer();

    clearActionHistory();

    document.getElementById('current-turn').innerText = `現在のターン: プリフロップ`;
    currentTurn = 'プリフロップ';

    updateTable();
}

function updateBlinds() {
    // BTN, SB, BBの設定
    removeBlinds();
    document.querySelector(`#player-${btnIndex}`).innerHTML += '<div class="btn">BTN</div>';
    document.querySelector(`#player-${sbIndex}`).innerHTML += '<div class="sb">SB</div>';
    document.querySelector(`#player-${bbIndex}`).innerHTML += '<div class="bb">BB</div>';
}

function removeBlinds() {
    document.querySelectorAll('.btn, .sb, .bb').forEach(element => element.remove());
}

function resetBetSizing() {
    document.getElementById('bet-amount').value = '';
}

function addBlindToTotalPot(playerIndex, amount) {
    players[playerIndex].chips -= amount;
    players[playerIndex].bet += amount;
    updateBet(playerIndex);
}

function updateChips() {
    players.forEach((player, index) => {
        document.getElementById(`chips-${index}`).innerText = player.chips;
    });
}

function updateBet(playerIndex) {
    const betElement = document.getElementById(`bet-${playerIndex}`);
    if (betElement) {
        betElement.innerText = players[playerIndex].bet;
        updatePotDisplay();
    } else {
        console.error(`Bet element for player ${playerIndex} not found`);
    }
}

function updatePot() {
    const potElement = document.getElementById('pot');
    if (potElement) {
        potElement.innerText = `ポット: ${totalPot}`;
    } else {
        console.error("Pot element not found");
    }
}

// プレイヤーがベットした場合の処理
function placeBet() {
    const betAmount = parseInt(document.getElementById('bet-amount').value) - players[actionPlayerIndex].bet;
    if (isNaN(betAmount) || betAmount <= 0 || betAmount > players[actionPlayerIndex].chips || players[actionPlayerIndex].folded) {
        alert('無効なベット額です。');
        return;
    }

    players[actionPlayerIndex].chips -= betAmount;
    players[actionPlayerIndex].bet += betAmount;
    updateChips();
    updateBet(actionPlayerIndex);
    addActionHistory(players[actionPlayerIndex].name, `ベット ${betAmount}`);

    // ベット後にチップがゼロになった場合の処理
    if (players[actionPlayerIndex].chips === 0) {
        document.getElementById(`player-${actionPlayerIndex}`).classList.add('all-in');
        addActionHistory(players[actionPlayerIndex].name, 'オールイン');
    }

    // アクションプレイヤーの切り替え
    nextActionPlayer();
}

// プレイヤーがコールした場合の処理
function callBet() {
    const maxBet = Math.max(...players.map(player => player.bet));
    const callAmount = maxBet - players[actionPlayerIndex].bet;

    if (players[actionPlayerIndex].chips <= callAmount) {
        // オールインコール
        const allInAmount = players[actionPlayerIndex].chips;
        players[actionPlayerIndex].chips = 0;
        players[actionPlayerIndex].bet += allInAmount;
        document.getElementById(`player-${actionPlayerIndex}`).classList.add('all-in');
        addActionHistory(players[actionPlayerIndex].name, `オールインコール ${allInAmount}`);
    } else {
        // 通常のコール
        players[actionPlayerIndex].chips -= callAmount;
        players[actionPlayerIndex].bet += callAmount;
        addActionHistory(players[actionPlayerIndex].name, `コール ${callAmount}`);
    }

    updateChips();
    updateBet(actionPlayerIndex);
    nextActionPlayer();
}

function foldBet() {
    if (players[actionPlayerIndex].folded) {
        alert('既にフォールドされています。');
        return;
    }

    // ベットをポットに加算する
    totalPot += players[actionPlayerIndex].bet;
    players[actionPlayerIndex].bet = 0;

    players[actionPlayerIndex].folded = true;
    document.getElementById(`player-${actionPlayerIndex}`).classList.add('folded');
    addActionHistory(players[actionPlayerIndex].name, 'フォールド');

    updateWinnerSelect(); // プルダウンを更新

    // アクションプレイヤーの切り替え
    nextActionPlayer();
}

function checkBet() {
    if (players[actionPlayerIndex].folded) {
        alert('フォールドしたプレイヤーはチェックできません。');
        return;
    }

    players[actionPlayerIndex].bet += 0; // チェックは0点のベットとみなす
    addActionHistory(players[actionPlayerIndex].name, 'チェック');

    // アクションプレイヤーの切り替え
    nextActionPlayer();
}

// 次のターンボタンが押された時の処理
function nextTurn() {
    const turns = ['プリフロップ', 'フロップ', 'ターン', 'リバー'];
    let currentIndex = turns.indexOf(currentTurn);
    if (currentIndex < turns.length - 1) {
        currentTurn = turns[currentIndex + 1];
    } else {
        currentTurn = 'ショウダウン';
        prepareShowdown();
        return;
    }

    document.getElementById('current-turn').innerText = `現在のターン: ${currentTurn}`;
    calculatePots(); // ポットとサイドポットを計算
    resetBets(); // ベット額のみリセット
    resetBetSizing() //ベットサイズ入力欄リセット
    setActionPlayerToSB(); // 最初のアクションプレイヤーをSBからに設定
    highlightActionPlayer();
    addActionHistory('', `${currentTurn}`);
}

// ポットを計算する処理
function calculatePots() {
    sidePots = [];
    let activePlayers = players.filter(player => player.bet > 0).sort((a, b) => a.bet - b.bet);

    while (activePlayers.length > 0) {
        const minBet = activePlayers[0].bet;
        let sidePotAmount = 0;
        console.log('最小ベット：' + minBet);

        activePlayers.forEach(player => {
            if (player.bet >= minBet) {
                mainPot += minBet;
                player.bet -= minBet;
                sidePotAmount = player.bet;
                console.log('サイドポット：' + sidePotAmount);
            }
        });

        activePlayers = activePlayers.filter(player => player.bet > 0);

        if (activePlayers.length > 0) {
            sidePots.push({ amount: sidePotAmount, eligiblePlayers: [...activePlayers] });
        }
    }

    console.log('メインポット：' + mainPot);
    totalPot += mainPot; // 現在のターンのメインポットをトータルポットに加算
    mainPot = 0;
    console.log('トータルポット：' + totalPot);
    updatePotDisplay();
    resetBets()
}

function updatePotDisplay() {
    let potHTML = `ポット: ${totalPot}<br>`;
    sidePots.forEach((sidePot, index) => {
        potHTML += `サイドポット${index + 1}: ${sidePot.amount}<br>`;
    });
    const potDisplayElement = document.getElementById('pot-display');
    if (potDisplayElement) {
        potDisplayElement.innerHTML = potHTML;
    } else {
        console.error("Pot display element not found");
    }
}

function setActionPlayerToUTG() {
    actionPlayerIndex = (bbIndex + 1) % players.length;
    while (players[actionPlayerIndex].folded) {
        actionPlayerIndex = (actionPlayerIndex + 1) % players.length;
    }
}

function nextActionPlayer() {
    let nextPlayerIndex = (actionPlayerIndex + 1) % players.length;
    let initialPlayerIndex = actionPlayerIndex;
    let foundNextPlayer = false;

    do {
        // 次のプレイヤーがフォールドしているか、チップがゼロの場合は次のプレイヤーへ
        if (!players[nextPlayerIndex].folded && players[nextPlayerIndex].chips > 0) {
            actionPlayerIndex = nextPlayerIndex;
            foundNextPlayer = true;
        } else {
            nextPlayerIndex = (nextPlayerIndex + 1) % players.length;
        }

        // すべてのプレイヤーを一巡した場合はループを抜ける
        if (nextPlayerIndex === initialPlayerIndex) {
            break;
        }
    } while (!foundNextPlayer);

    // アクションプレイヤーが更新された場合はハイライトを更新
    if (foundNextPlayer) {
        highlightActionPlayer();
    } else {
        // すべてのプレイヤーがフォールドまたはチップがゼロの場合は次のターンへ
        checkForNextTurn();
    }
}

function highlightActionPlayer() {
    document.querySelectorAll('.player').forEach((playerElement, index) => {
        if (index === actionPlayerIndex && !players[index].folded && players[index].chips > 0) {
            playerElement.classList.add('action-player');
        } else {
            playerElement.classList.remove('action-player');
        }
    });
}

function resetBets() {
    players.forEach((player, index) => {
        playerBetSize[index] = 0;
    });
    updateAllBets();
    updatePotDisplay();
}

function updateAllBets() {
    players.forEach((player, index) => updateBet(index));
}

// 負けたプレイヤーを管理する関数
function updateDefeatedPlayers() {
    players.forEach((player, index) => {
        if (player.chips === 0 && !player.folded) {
            player.folded = true; // フォールド扱いにする
            document.getElementById(`player-${index}`).classList.remove('all-in');
            document.getElementById(`player-${index}`).classList.add('defeated');
            addActionHistory(player.name, '敗北');
        }
    });
}

function setActionPlayerToSB() {
    actionPlayerIndex = sbIndex;
    while (players[actionPlayerIndex].folded) {
        actionPlayerIndex = (actionPlayerIndex + 1) % players.length;
    }
}

function nextHand() {
    currentHand++;
    document.getElementById('hand-number').innerText = `ハンド数: ${currentHand}`;
    totalPot = 0; // ポットをリセット
    players.forEach(player => player.folded = false); // フォールド状態をリセット
    startNewHand();
    clearActionHistory(); // ハンドが切り替わった時にアクション履歴をリセット
    document.getElementById('showdown-actions').style.display = 'none';
    document.getElementById('sidepot-display').style.display = 'none';
}

function prepareShowdown() {
    calculatePots();
    resetBets();
    updateWinnerSelect(); // メインポット用のプルダウンメニューを更新
    document.getElementById('showdown-actions').style.display = 'block';

    // サイドポットの表示
    let sidePotHTML = '';
    sidePots.forEach((sidePot, index) => {
        sidePotHTML += `
            サイドポット${index + 1}: ${sidePot.amount}点
            <select id="sidepot-winner-${index}">
                ${sidePot.eligiblePlayers.map(player => `<option value="${player.name}">${player.name}</option>`).join('')}
            </select>
        `;
    });
    document.getElementById('sidepot-display').innerHTML = sidePotHTML;
}

function updateWinnerSelect() {
    let winnerOptions = '';
    players.forEach((player, index) => {
        if (!player.folded) {
            winnerOptions += `<option value="${index}">${player.name}</option>`;
        }
    });
    document.getElementById('winner-select').innerHTML = winnerOptions;
}

function awardPot() {
    const winnerIndex = parseInt(document.getElementById('winner-select').value);
    if (winnerIndex < 0 || winnerIndex >= players.length || players[winnerIndex].folded) {
        alert('無効な勝者です。');
        return;
    }

    let getMainPot = totalPot;

    // サイドポットの配分
    sidePots.forEach((sidePot, index) => {
        const winnerName = document.getElementById(`sidepot-winner-${index}`).value;
        const winner = players.find(player => player.name === winnerName);
        winner.chips += sidePot.amount;
        addActionHistory(winner.name, `サイドポット${index + 1}： ${sidePot.amount} 点獲得`);
        getMainPot -= sidePot.amount;
        sidePot.amount = 0;
    });

    // メインポットの配分
    players[winnerIndex].chips += getMainPot;
    addActionHistory(players[winnerIndex].name, `ポット： ${getMainPot} 点獲得`);
    totalPot = 0;
    mainPot = 0;

    document.getElementById('pot-display').innerText = `ポット: ${totalPot}`;
    resetBets();
    updateChips();
}

function addActionHistory(playerName, action) {
    actionHistory.push(`${playerName}: ${action}`);
    document.getElementById('action-history').innerText = actionHistory.join('\n');
}

function clearActionHistory() {
    actionHistory = [];
    document.getElementById('action-history').innerText = '';
}

function updateTable() {
    const tableRadius = 250; // プレイヤーを配置する円の半径を広くする
    const centerX = 400; // ポーカーテーブルの中心位置を変更
    const centerY = 300; // ポーカーテーブルの中心位置を変更
    players.forEach((player, index) => {
        const angle = (2 * Math.PI / players.length) * index;
        const x = centerX + tableRadius * Math.cos(angle) - 50;
        const y = centerY + tableRadius * Math.sin(angle) - 50;
        const playerElement = document.getElementById(`player-${index}`);
        if (playerElement) {
            playerElement.style.left = `${x}px`;
            playerElement.style.top = `${y}px`;
        }
    });
}