// player_manager.js

const utils = require('./utils');
const config = require('./config');
const admin = require('./admin'); // Для проверки админки при назначении ID

const PlayerManager = {
    players: {}, // Хранилище игроков { [player_id]: player_object }
    playerCustomIDs: {}, // Хранилище наших кастомных ID { [custom_id]: player_id }
    nextCustomID: 1,
};

// Инициализация всех игроков при старте режима
PlayerManager.initPlayers = function(gameApi) {
    this.players = {};
    this.playerCustomIDs = {};
    this.nextCustomID = 1;

    // Получаем всех текущих игроков
    const currentPlayers = gameApi.getPlayers(); // Предполагаемая функция API
    for (const player of currentPlayers) {
        this.addPlayer(player, gameApi);
    }
};

// Добавление нового игрока
PlayerManager.addPlayer = function(player, gameApi) {
    if (!player || !player.id) return;

    player.custom_id = this.nextCustomID;
    player.money = gameApi.getPlayerMoney(player.id); // Загрузка монет
    player.status = 'none'; // Начальный статус
    player.kills = 0; // Начальное количество убийств

    this.players[player.id] = player;
    this.playerCustomIDs[this.nextCustomID] = player.id;

    // Назначение админки первому игроку, если включено
    if (config.firstPlayerIsAdmin && this.nextCustomID === 1) {
        admin.giveAdmin(player, gameApi); // Передаем gameApi, если нужно
    }

    this.nextCustomID++;
    console.log(`Player ${player.name} (API ID: ${player.id}) assigned custom ID: ${player.custom_id}`);
};

// Удаление игрока
PlayerManager.removePlayer = function(player, gameApi) {
    if (!player || !player.custom_id) return;

    const customId = player.custom_id;
    const apiId = player.id;

    delete this.players[apiId];
    delete this.playerCustomIDs[customId];

    // Удаление админки, если игрок был админом (опционально)
    if (admin.isAdmin(player)) {
        admin.removeAdmin(player, gameApi);
    }

    console.log(`Player ${player.name} (API ID: ${apiId}, Custom ID: ${customId}) removed.`);
};

// Получение игрока по его API ID
PlayerManager.getPlayerByApiId = function(apiId) {
    return this.players[apiId];
};

// Получение игрока по нашему кастомному ID
PlayerManager.getPlayerByCustomId = function(customId) {
    const apiId = this.playerCustomIDs[customId];
    if (apiId) {
        return this.players[apiId];
    }
    return null;
};

// Получение всех активных игроков
PlayerManager.getAllPlayers = function() {
    const activePlayers = [];
    for (const apiId in this.players) {
        activePlayers.push(this.players[apiId]);
    }
    return activePlayers;
};

// Обновление монеток игрока
PlayerManager.updatePlayerMoney = function(player, amount, gameApi) {
    if (!player || !this.isPlayerOnline(player.id)) return false;
    const currentMoney = gameApi.getPlayerMoney(player.id); // Получаем текущие монеты через API
    const newMoney = currentMoney + amount;
    if (newMoney >= 0) {
        gameApi.setPlayerMoney(player.id, newMoney); // Устанавливаем новые монеты через API
        player.money = newMoney; // Обновляем наше значение
        return true;
    }
    return false; // Недостаточно средств
};

// Обновление убийств игрока
PlayerManager.addKill = function(player) {
    if (!player) return;
    player.kills = (player.kills || 0) + 1;
};

// Проверка, онлайн ли игрок по API ID
PlayerManager.isPlayerOnline = function(apiId) {
    return this.players.hasOwnProperty(apiId);
};

module.exports = PlayerManager;
