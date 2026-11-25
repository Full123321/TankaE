// commands.js

const utils = require('./utils');
const config = require('./config');
const admin = require('./admin');
const playerManager = require('./player_manager');
const zones = require('./zones'); // Для доступа к зонам передачи денег

const Commands = {
    // Обработка входящих сообщений в чат
    handleChatMessage: function(player, message, gameApi) {
        if (!message || !message.startsWith("/")) return false; // Не обрабатываем, если не команда

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
                        // Получаем позицию исполнителя команды
                        const executorPos = gameApi.getPlayerPosition(player.id);
                        if (executorPos) {
                            gameApi.teleportPlayer(targetPlayer.id, executorPos);
                            gameApi.sendChatMessage(player.id, utils.formatString(config.texts.playerTeleportedToYou, { targetID: targetPlayer.custom_id }));
                        } else {
                            gameApi.sendChatMessage(player.id, "Не удалось получить вашу позицию.");
                        }
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
                gameApi.sendChatMessage(p.id, config.texts.hintMessage);
            });
            return true;
        }

        // Команда /spawn
        if (command.startsWith(config.commands.spawnPrefix)) {
            const spawnId = parseInt(arg1, 10);
            if (utils.isNumber(spawnId) && spawnId === player.custom_id) {
                const spawnPos = gameApi.getSpawnPosition(); // TODO: Получить реальную позицию спавна
                if (spawnPos) {
                    gameApi.teleportPlayer(player.id, spawnPos);
                    gameApi.sendChatMessage(player.id, config.texts.teleportedToSpawn);
                } else {
                    gameApi.sendChatMessage(player.id, "Не удалось получить позицию спавна.");
                }
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
                gameApi.sendChatMessage(player.id, `Использование: ${config.commands.adminPrefix} [ID игрока]`);
            }
            return true;
        }

        // Команда /ban
        if (command === config.commands.banPrefix) {
            if (arg1) {
                admin.handleBanCommand(player, parseInt(arg1, 10), gameApi);
            } else {
                gameApi.sendChatMessage(player.id, `Использование: ${config.commands.banPrefix} [ID игрока]`);
            }
            return true;
        }

        // Команда /help
        if (command === config.commands.helpCommand) {
            gameApi.sendChatMessage(player.id, config.texts.helpCommand);
            return true;
        }

        // Команда /transfer
        if (command === config.commands.transferCommand) {
            const targetId = parseInt(arg1, 10);
            const amount = parseInt(arg2, 10);

            if (!utils.isNumber(targetId) || !utils.isNumber(amount) || amount <= 0) {
                gameApi.sendChatMessage(player.id, config.texts.transferHelp);
                return true;
            }

            const targetPlayer = playerManager.getPlayerByCustomId(targetId);
            if (!targetPlayer) {
                gameApi.sendChatMessage(player.id, utils.formatString(config.texts.playerNotFound, { playerID: targetId }));
                return true;
            }

            // Нельзя переводить деньги самому себе
            if (targetPlayer.id === player.id) {
                gameApi.sendChatMessage(player.id, "Вы не можете переводить деньги самому себе.");
                return true;
            }

            // Проверяем, есть ли у игрока нужная сумма
            const currentMoney = gameApi.getPlayerMoney(player.id) || 0;
            if (currentMoney < amount) {
                gameApi.sendChatMessage(player.id, config.texts.transferNotEnoughFunds);
                return true;
            }

            // Выполняем перевод
            const successSender = playerManager.updatePlayerMoney(player, -amount, gameApi);
            const successReceiver = playerManager.updatePlayerMoney(targetPlayer, amount, gameApi);

            if (successSender && successReceiver) {
                gameApi.sendChatMessage(player.id, utils.formatString(config.texts.transferSuccess, { amount: amount, playerName: targetPlayer.name }));
                gameApi.sendChatMessage(targetPlayer.id, utils.formatString(config.texts.receivedTransfer, { amount: amount, senderName: player.name }));
            } else {
                // Если что-то пошло не так (например, недостаточно средств у отправителя уже после проверки)
                gameApi.sendChatMessage(player.id, "Ошибка перевода. Попробуйте позже.");
                // Возможно, нужно вернуть деньги отправителю, если перевод не прошел
            }
            return true;
        }

        return false; // Команда не найдена или не обработана
    }
};

module.exports = Commands;
