// commands.js

const utils = require('./utils');
const config = require('./config');
const admin = require('./admin');
const playerManager = require('./player_manager');
const zones = require('./zones'); // Для доступа к зонам передачи денег

const Commands = {
    // Обработка входящих сообщений в чат
    handleChatMessage: function(player, message, gameApi) {
        if (!message) return false;

        // Проверка на команду
        if (message.startsWith("/")) {
            const args = utils.split(message, " ");
            const command = args[0].toLowerCase();
            const arg1 = args[1]; // Может быть ID или суммой
            const arg2 = args[2]; // Может быть суммой

            // Команда /tp
            if (command === config.commands.tpPrefix) {
                if (admin.isAdmin(player)) {
                    if (arg1 && arg2) {
                        const targetPlayer = playerManager.getPlayerByCustomId(parseInt(arg2, 10));
                        if (targetPlayer) {
                            gameApi.teleportPlayer(targetPlayer.id, player.position); // Телепорт к исполнителю
                            gameApi.sendChatMessage(player.id, utils.formatString(config.texts.playerTeleportedToYou, { targetID: targetPlayer.custom_id }));
                        } else {
                            gameApi.sendChatMessage(player.id, utils.formatString(config.texts.playerNotFound, { playerID: arg2 }));
                        }
                    } else {
                        gameApi.sendChatMessage(player.id, `Использование: ${config.commands.tpPrefix} [ваш ID] [ID игрока для телепортации]`);
                    }
                } else {
                    gameApi.sendChatMessage(player.id, config.texts.noAdminRights);
                }
                return true; // Команда обработана
            }

            // Команда /pop
            if (command === config.commands.popCommand) {
                // Отображение сообщения всем игрокам
                const players = playerManager.getAllPlayers();
                players.forEach(p => {
                    gameApi.sendChatMessage(p.id, config.texts.hintMessage); // Используем текст из конфига
                });
                return true;
            }

            // Команда /spawn
            if (command.startsWith(config.commands.spawnPrefix)) {
                const spawnId = parseInt(arg1, 10);
                if (utils.isNumber(spawnId) && spawnId === player.custom_id) {
                    const spawnPos = gameApi.getSpawnPosition(); // Пример
                    gameApi.teleportPlayer(player.id, spawnPos);
                    gameApi.sendChatMessage(player.id, config.texts.teleportedToSpawn);
                } else if (arg1) {
                    gameApi.sendChatMessage(player.id, "Вы можете использовать /spawn только для себя.");
                } else {
                    gameApi.sendChatMessage(player.id, `Использование: ${config.commands.spawnPrefix} [ваш ID]`);
                }
                return true;
            }

            // Команда /adm
            if (command === config.commands.adminPrefix) {
                if (arg1) {
                    admin.handleAdmCommand(player, parseInt(arg1, 10), gameApi);
                } else {
                    gameApi.send
