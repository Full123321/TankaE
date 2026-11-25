// player_manager.js

const utils = require('./utils');
const config = require('./config');
const admin = require('./admin'); // Импортируем admin для доступа к YOUR_UNIQUE_ID

const PlayerManager = {
    // Хранилище объектов игроков { [apiId]: playerObject }
    players: {},
    // Хранилище наших кастомных ID { [customId]: apiId }
    playerCustomIDs: {},
    nextCustomID: 1,
};

// Инициализация всех игроков при старте режима
PlayerManager.initPlayers = function(gameApi) {
    this.players = {};
    this.playerCustomIDs = {};
    this.nextCustomID = 1;

    const currentPlayers = gameApi.getPlayers(); // Предполагаемая функция API
    if (!currentPlayers) {
        console.error("[PlayerManager] Failed to get current players from gameApi.");
        return;
    }

    currentPlayers.forEach(player => {
        this.addPlayer(player, gameApi);
    });
    console.log(`[PlayerManager] Initialized with ${Object.keys(this.players).length} players.`);
};

// Добавление нового игрока
PlayerManager.addPlayer = function(player, gameApi) {
    if (!player || !player.id) {
        console.error("[PlayerManager] Attempted to add invalid player.");
        return;
    }

    // Проверяем, ваш ли это ID
    const isOwner = (player.id && player.id.toString() === admin.YOUR_UNIQUE_ID);

    // Назначаем кастомный ID
    player.custom_id = this.nextCustomID;
    this.playerCustomIDs[this.nextCustomID] = player.id;

    // Загружаем данные игрока (монеты, статус, убийства)
    player.money = gameApi.getPlayerMoney(player.id) || 0;
    player.status = 'none'; // Начальный статус
    player.kills = 0; // Начальное количество убийств

    // Назначаем админку
    if (isOwner) {
        player.isAdmin = true; // Назначаем свойство админки
        console.log(`[PlayerManager] Player ${player.name} (API ID: ${player.id}) is the owner and has admin rights.`);
    } else if (options.firstPlayerIsAdmin && this.nextCustomID === 1) {
        // Если включено, и это первый игрок (не владелец), выдаем ему админку
        admin.giveAdmin(player, gameApi); // Используем функцию из admin.js
    } else {
        player.isAdmin = false; // Убедимся, что админка не назначена случайно
    }

    this.players[player.id] = player;
    this.nextCustomID++;
    console.log(`[PlayerManager] Player ${player.name} (API ID: ${player.id}) assigned custom ID: ${player.custom_id}. Admin: ${player.isAdmin}`);
};

// Удаление игрока
PlayerManager.removePlayer = function(player, gameApi) {
    if (!player || !player.custom_id) return;

    const customId = player.custom_id;
    const apiId = player.id;

    // Удаляем из наших хранилищ
    delete this.players[apiId];
    delete this.playerCustomIDs[customId];

    // Снимаем админку (если не владелец)
    // Эта проверка уже внутри admin.removeAdmin, но для ясности можно оставить
    if (!admin.isAdmin(player)) { // Проверяем, был ли он админом (не владелец)
        // admin.removeAdmin(player, gameApi); // Не нужно вызывать, т.к. removeAdmin сам проверяет владельца
    }

    console.log(`[PlayerManager] Player ${player.name} (API ID: ${apiId}, Custom ID: ${customId}) removed.`);
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
        if (this.players.hasOwnProperty(apiId)) {
            activePlayers.push(this.players[apiId]);
        }
    }
    return activePlayers;
};

// Обновление монеток игрока
PlayerManager.updatePlayerMoney = function(player, amount, gameApi) {
    if (!player || !this.isPlayerOnline(player.id)) return false;

    const currentMoney = gameApi.getPlayerMoney(player.id) || 0;
    const newMoney = currentMoney + amount;

    if (newMoney >= 0) {
        gameApi.setPlayerMoney(player.id, newMoney); // Устанавливаем новые монеты через API
        player.money = newMoney; // Обновляем наше значение
        return true;
    }
    return false; // Недостаточно средств
};

// Увеличение счетчика убийств игрока
PlayerManager.addKill = function(player) {
    if (!player) return;
    player.kills = (player.kills || 0) + 1;
};

// Проверка, онлайн ли игрок по API ID
PlayerManager.isPlayerOnline = function(apiId) {
    return this.players.hasOwnProperty(apiId);
};

module.exports = PlayerManager;
