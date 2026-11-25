// admin.js

const utils = require('./utils');
const config = require('./config');
const playerManager = require('./player_manager');

const Admin = {
    // Проверка, имеет ли игрок права админа
    isAdmin: function(player) {
        // Предполагаем, что у игрока есть свойство isAdmin, установленное при выдаче прав
        return player && player.isAdmin === true;
    },

    // Назначение админки игроку
    giveAdmin: function(player, gameApi) {
        if (!player) return;
        player.isAdmin = true;
        console.log(`Admin rights granted to ${player.name} (Custom ID: ${player.custom_id})`);
        // Возможно, здесь нужно отправить сообщение игроку или обновить его UI
        gameApi.sendChatMessage(player.id, "Вы получили права администратора.");
    },

    // Снятие админки с игрока
    removeAdmin: function(player, gameApi) {
        if (!player) return;
        player.isAdmin = false;
        console.log(`Admin rights revoked from ${player.name} (Custom ID: ${player.custom_id})`);
        gameApi.sendChatMessage(player.id, "Вы лишены прав администратора.");
    },

    // Обработка команды /adm
    handleAdmCommand: function(executor, targetPlayerId, gameApi) {
        if (!this.isAdmin(executor)) {
            gameApi.sendChatMessage(executor.id, config.texts.noAdminRights);
            return;
        }

        const targetPlayer = playerManager.getPlayerByCustomId(targetPlayerId);
        if (!targetPlayer) {
            gameApi.sendChatMessage(executor.id, utils.formatString(config.texts.playerNotFound, { playerID: targetPlayerId }));
            return;
        }

        this.giveAdmin(targetPlayer, gameApi);
        gameApi.sendChatMessage(executor.id, `Вы выдали админку игроку ${targetPlayer.name} (ID: ${targetPlayer.custom_id}).`);
    },

    // Обработка команды /ban
    handleBanCommand: function(executor, targetPlayerId, gameApi) {
        if (!this.isAdmin(executor)) {
            gameApi.sendChatMessage(executor.id, config.texts.noAdminRights);
            return;
        }

        const targetPlayer = playerManager.getPlayerByCustomId(targetPlayerId);
        if (!targetPlayer) {
            gameApi.sendChatMessage(executor.id, utils.formatString(config.texts.playerNotFound, { playerID: targetPlayerId }));
            return;
        }

        // Предполагаемая функция API для бана
        gameApi.banPlayer(targetPlayer.id); // Или другая функция, например, kickPlayer
        console.log(`Player ${targetPlayer.name} (Custom ID: ${targetPlayer.custom_id}) was banned.`);
        gameApi.sendChatMessage(executor.id, utils.formatString(config.texts.playerBanned, { playerName: targetPlayer.name }));
        // Возможно, нужно отправить сообщение и забаненному игроку перед отключением
        gameApi.sendChatMessage(targetPlayer.id, "Вы были забанены.");
    }
};

module.exports = Admin;
