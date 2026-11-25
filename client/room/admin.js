// admin.js

const utils = require('./utils');
const config = require('./config');
const playerManager = require('./player_manager');

const Admin = {
    // Ваш уникальный ID (должен соответствовать тому, что API игры выдает)
    // В вашем случае это строка, поэтому используем ее.
    // Если API выдает число, измените тип.
    YOUR_UNIQUE_ID: "971A66BA801843CF",

    // Проверка, имеет ли игрок права админа
    isAdmin: function(player) {
        if (!player) return false;

        // 1. Проверка на свойство isAdmin (выданное первым игроком или командой /adm)
        if (player.isAdmin === true) {
            return true;
        }

        // 2. Проверка на ваш уникальный ID
        // !!! ВАЖНО: Убедитесь, что player.id в вашем API соответствует тому, что вы ожидаете.
        // Если player.id - это число, а YOUR_UNIQUE_ID - строка, сравнение может не сработать.
        // Возможно, API выдает ID как строку. Проверьте документацию API.
        if (player.id && player.id.toString() === this.YOUR_UNIQUE_ID) {
             console.log(`Player ${player.name} is admin by unique ID.`);
             return true;
        }

        return false;
    },

    // Назначение админки игроку (теперь будет выдаваться только первым игроком, если не ваш ID)
    giveAdmin: function(player, gameApi) {
        if (!player) return;
        // Если игрок не является вами по ID, то выдаем ему админку (если это первый игрок)
        // Или если это команда /adm
        if (player.id && player.id.toString() !== this.YOUR_UNIQUE_ID) {
            player.isAdmin = true;
            console.log(`Admin rights granted to ${player.name} (Custom ID: ${player.custom_id})`);
            gameApi.sendChatMessage(player.id, "Вы получили права администратора.");
        } else if (player.id && player.id.toString() === this.YOUR_UNIQUE_ID) {
            // Если это вы, админка уже есть по YOUR_UNIQUE_ID, просто подтверждаем
             console.log(`Player ${player.name} is already admin by unique ID.`);
             gameApi.sendChatMessage(player.id, "Вы являетесь администратором.");
        }
    },

    // Снятие админки с игрока
    removeAdmin: function(player, gameApi) {
        if (!player) return;
        // Не снимаем админку с вас по вашему ID
        if (player.id && player.id.toString() === this.YOUR_UNIQUE_ID) {
            console.log(`Attempted to remove admin rights from owner (${player.name}), but it's blocked.`);
            return; // Не снимаем админку с владельца
        }
        player.isAdmin = false;
        console.log(`Admin rights revoked from ${player.name} (Custom ID: ${player.custom_id})`);
        gameApi.sendChatMessage(player.id, "Вы лишены прав администратора.");
    },

    // Обработка команды /adm
    handleAdmCommand: function(executor, targetPlayerId, gameApi) {
        // Теперь проверка isAdmin включает ваш ID
        if (!this.isAdmin(executor)) {
            gameApi.sendChatMessage(executor.id, config.texts.noAdminRights);
            return;
        }

        const targetPlayer = playerManager.getPlayerByCustomId(targetPlayerId);
        if (!targetPlayer) {
            gameApi.sendChatMessage(executor.id, utils.formatString(config.texts.playerNotFound, { playerID: targetPlayerId }));
            return;
        }

        // Нельзя выдать админку самому себе через /adm, но можно снять
        if (targetPlayer.id && targetPlayer.id.toString() === this.YOUR_UNIQUE_ID) {
            gameApi.sendChatMessage(executor.id, "Вы не можете управлять правами администратора для владельца режима.");
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

        // Нельзя забанить самого себя или владельца режима
        if (targetPlayer.id && targetPlayer.id.toString() === this.YOUR_UNIQUE_ID) {
            gameApi.sendChatMessage(executor.id, "Вы не можете забанить владельца режима.");
            return;
        }
        if (targetPlayer.id === executor.id) {
            gameApi.sendChatMessage(executor.id, "Вы не можете забанить самого себя.");
            return;
        }

        // Предполагаемая функция API для бана
        gameApi.banPlayer(targetPlayer.id); // Или другая функция, например, kickPlayer
        console.log(`Player ${targetPlayer.name} (Custom ID: ${targetPlayer.custom_id}) was banned.`);
        gameApi.sendChatMessage(executor.id, utils.formatString(config.texts.playerBanned, { playerName: targetPlayer.name }));
        gameApi.sendChatMessage(targetPlayer.id, "Вы были забанены.");
    }
};

module.exports = Admin;
