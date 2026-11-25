// gamemode.js

// Импортируем все модули
const options = require('./options');
const teams = require('./default_teams'); // Если используется
const config = require('./config');
const zones = require('./zones');
const commands = require('./commands');
const admin = require('./admin');
const ui = require('./ui');
const utils = require('./utils');
const playerManager = require('./player_manager');

// --- Основные события игры ---

// Вызывается при старте режима
function onGamemodeStart(gameApi) {
    console.log(`[Gamemode] Starting: ${options.gamemodeName}`);
    const startTime = Date.now();
    ui.setServerStartTime(startTime); // Устанавливаем время старта для UI

    // Инициализация всех зон
    zones.initZones(gameApi);

    // Инициализация менеджера игроков
    playerManager.initPlayers(gameApi);

    // Установка бесконечного времени, если указано
    if (options.maxGameTime === 0) {
        // gameApi.setGameTime(0); // TODO: Реализовать через API игры
        console.log("[Gamemode] Infinite game time enabled.");
    }

    // Запуск таймера для обновления UI
    // Предполагаем, что gameApi.createTimer(callback, interval_ms) существует
    if (gameApi.createTimer) {
        gameApi.createTimer(updateTimers, 1000); // Обновлять UI каждую секунду
        console.log("[Gamemode] UI update timer started.");
    } else {
        console.warn("[Gamemode] gameApi.createTimer not found. UI will not update automatically.");
    }
}

// Вызывается при подключении нового игрока
function onPlayerJoin(player, gameApi) {
    console.log(`[Player] Player joined: ${player.name} (API ID: ${player.id})`);

    // Добавляем игрока в наш менеджер (он также назначает custom_id и isAdmin)
    playerManager.addPlayer(player, gameApi);

    // Получаем обновленный объект игрока с custom_id
    const addedPlayer = playerManager.getPlayerByApiId(player.id);

    // Телепорт на спавн
    const spawnPos = gameApi.getSpawnPosition(); // TODO: Получить реальную позицию спавна из default
