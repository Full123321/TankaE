// ui.js

const utils = require('./utils');
const config = require('./config');
const options = require('./options');
const playerManager = require('./player_manager');

// Глобальная переменная для времени старта сервера (должна быть установлена в gamemode.js)
let serverStartTime = 0;

const UI = {
    // Шаблон строки для HUD
    hudTemplate: config.uiHudTemplate,

    // Функция для обновления UI (будет вызываться из gamemode.js)
    updateUI: function(gameApi) {
        const players = playerManager.getAllPlayers();
        const currentTime = Date.now();
        // Используем serverStartTime, установленное в gamemode.js
        const elapsedSeconds = serverStartTime > 0 ? Math.floor((currentTime - serverStartTime) / 1000) : 0;

        // Форматирование времени работы сервера
        const timeString = utils.formatTime(elapsedSeconds);

        // Смена цвета радуги
        const currentColorIndex = options.rainbowColorInterval > 0
            ? Math.floor(elapsedSeconds / options.rainbowColorInterval) % config.rainbowColors.length
            : 0;
        const currentColor = config.rainbowColors[currentColorIndex];

        players.forEach(player => {
            const playerMoney = gameApi.getPlayerMoney(player.id) || 0;
            const playerKills = player.kills || 0;
            const playerStatus = player.status || 'none';
            const roomID = player.custom_id; // Используем наш кастомный ID как Room ID

            let hudText = this.hudTemplate;
            hudText = hudText.replace("{gamemodeName}", options.gamemodeName);
            hudText = hudText.replace("{serverTime}", timeString);
            hudText = hudText.replace("{rainbowColor}", currentColor);
            hudText = hudText.replace("{playerStatus}", playerStatus);
            hudText = hudText.replace("{roomID}", roomID);
            hudText = hudText.replace("{playerMoney}", playerMoney);
            hudText = hudText.replace("{playerKills}", playerKills);
            hudText = hudText.replace("{playerID}", player.custom_id); // Ваш кастомный ID

            // TODO: Реализовать функцию установки текста на HUD
            // gameApi.setPlayerHudText(player.id, hudText);
            // console.log(`[UI] UI for ${player.name} (ID: ${player.custom_id}): ${hudText}`);
        });

        // TODO: Реализовать смену надписи "/help - тут все команды!" каждые 20 секунд
        // Это может быть отдельная функция или часть логики здесь.
    },

    // Функция для установки времени старта сервера (вызывается из gamemode.js)
    setServerStartTime: function(time) {
        serverStartTime = time;
    }
};

module.exports = UI;
