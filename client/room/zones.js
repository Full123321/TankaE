// zones.js

const utils = require('./utils');
const config = require('./config');
const playerManager = require('./player_manager');
const admin = require('./admin');

const Zones = {
    activeZones: [], // Массив всех созданных зон
};

// Структура зоны:
// {
//     id: unique_id,
//     name: zone_name,
//     tag: zone_tag,
//     position: { x, y, z, width, height, depth }, // Координаты и размеры
//     callback: function(player, gameApi) { ... }, // Функция, выполняемая при входе
//     requiredStatus: "status_name" or null, // Требуемый статус для входа
//     type: "buy" | "access" | "farm" | "teleport" | "info" | "transfer" // Тип зоны
// }

// Функция для создания зоны (должна быть вызвана при инициализации)
Zones.createZone = function(zoneData, gameApi) {
    if (!zoneData.name || !zoneData.tag || !zoneData.position || !zoneData.callback) {
        console.error("Error creating zone: incomplete data.", zoneData);
        return;
    }

    const newZone = {
        id: Date.now() + Math.random(), // Уникальный ID зоны
        name: zoneData.name,
        tag: zoneData.tag,
        position: zoneData.position,
        callback: zoneData.callback,
        requiredStatus: zoneData.requiredStatus || null,
        type: zoneData.type || "info",
        gameApi: gameApi // Передаем gameApi для использования в колбэках
    };

    this.activeZones.push(newZone);
    console.log(`Zone created: ${zoneData.name} (Tag: ${zoneData.tag})`);
};

// Инициализация всех зон из конфига
Zones.initZones = function(gameApi) {
    this.activeZones = []; // Очищаем предыдущие зоны

    // Фарм зоны
    config.farmZones.forEach(cfg => {
        this.createZone({
            name: cfg.name,
            tag: cfg.tag,
            position: { x: 0, y: 0, z: 0, width: 10, height: 10, depth: 10 }, // TODO: Задать реальные координаты
            callback: (player) => {
                const coins = utils.parseZoneValue(cfg.name);
                if (coins) {
                    playerManager.updatePlayerMoney(player, coins, gameApi);
                    gameApi.sendChatMessage(player.id, utils.formatString(config.texts.receivedMoney, { amount: coins }));
                }
            },
            type: "farm"
        }, gameApi);
    });

    // Зоны покупок оружия
    config.shopWeapons.forEach(cfg => {
        this.createZone({
            name: `${cfg.name}@${cfg.price}`, // Например: "Основное оружие@100"
            tag: cfg.tag,
            position: { x: 0, y: 0, z: 0, width: 10, height: 10, depth: 10 }, // TODO: Задать реальные координаты
            callback: (player) => {
                const [_, price] = utils.parseZoneValuesDouble(`${cfg.name}@${cfg.price}`); // Парсим цену из имени зоны
                const currentMoney = playerManager.getPlayerMoney(player.id); // Получаем деньги игрока

                if (price && currentMoney >= price) {
                    // TODO: Реализовать выдачу оружия по cfg.id
                    gameApi.giveItem(player.id, cfg.id, 1); // Пример
                    playerManager.updatePlayerMoney(player, -price, gameApi); // Снимаем деньги
                    gameApi.sendChatMessage(player.id, utils.formatString(config.texts.purchasedItem, { itemName: cfg.name, price: price }));
                } else {
                    gameApi.sendChatMessage(player.id, config.texts.notEnoughMoney);
                }
            },
            type: "buy"
        }, gameApi);
    });

    // Зоны передачи денег
    config.transferZones.forEach(cfg => {
        this.createZone({
            name: cfg.name,
            tag: cfg.tag,
            position: { x: 0, y: 0, z: 0, width: 10, height: 10, depth: 10 }, // TODO: Задать реальные координаты
            callback: (player) => {
                // TODO: Реализовать UI для выбора игрока и суммы для перевода
                gameApi.sendChatMessage(player.id, `Зона перевода денег. Введите ${config.commands.transferCommand} [ID игрока] [сумма]`);
            },
            type: "transfer"
        }, gameApi);
    });

    // Зоны покупки HP
    config.shopHp.forEach(cfg => {
        this.createZone({
            name: `${cfg.amount}@${cfg.price}`, // Например: "100@500"
            tag: "xp",
            position: { x: 0, y: 0, z: 0, width: 10, height: 10, depth: 10 }, // TODO: Задать реальные координаты
            callback: (player) => {
                const [hpAmount, price] = utils.parseZoneValuesDouble(`${cfg.amount}@${cfg.price}`);
                const currentMoney = playerManager.getPlayerMoney(player.id);

                if (hpAmount && price && currentMoney >= price) {
                    gameApi.healPlayer(player.id, hpAmount); // Пример
                    playerManager.updatePlayerMoney(player, -price, gameApi);
                    gameApi.sendChatMessage(player.id, `Вы восстановили ${hpAmount} HP за ${price} монет.`);
                } else {
                    gameApi.sendChatMessage(player.id, config.texts.notEnoughMoney);
                }
            },
            type: "buy"
        }, gameApi);
    });

    // Информационные зоны (подсказки)
    // Зона: "привет,как дела?" тэг: hint
    this.createZone({
        name: "привет,как дела?",
        tag: "hint",
        position: { x: 15, y: 5, z: 10, width: 5, height: 5, depth: 5 }, // TODO: Задать реальные координаты
        callback: (player) => {
            // TODO: Реализовать отображение сообщения только для игрока, наступившего на зону
            gameApi.sendChatMessage(player.id, config.texts.hintMessage); // Пример
        },
        type: "info"
    }, gameApi);

    // Зоны статусов
    config.statuses.forEach(cfg => {
        this.createZone({
            name: `${cfg.color}@${cfg.name}@${cfg.price}`,
            tag: cfg.tag,
            position: { x: 0, y: 0, z: 0, width: 10, height: 10, depth: 10 }, // TODO: Задать реальные координаты
            callback: (player) => {
                const [color, statusName, price] = utils.parseStatusZone(cfg.name);
                const currentMoney = playerManager.getPlayerMoney(player.id);

                if (statusName && price && currentMoney >= price) {
                    player.status = statusName; // Назначаем статус игроку
                    playerManager.updatePlayerMoney(player, -price, gameApi);
                    gameApi.sendChatMessage(player.id, utils.formatString(config.texts.purchasedStatus, { statusName: statusName, price: price }));
                } else {
                    gameApi.sendChatMessage(player.id, config.texts.notEnoughMoney);
                }
            },
            type: "buy"
        }, gameApi);
    });

    // Зоны доступа по статусу
    config.statusAccessZones.forEach(cfg => {
        this.createZone({
            name: cfg.name,
            tag: cfg.tag,
            position: { x: 0, y: 0, z: 0, width: 10, height: 10, depth: 10 }, // TODO: Задать реальные координаты
            callback: (player) => {
                if (player.status === cfg.requiredStatus) {
                    gameApi.sendChatMessage(player.id, `Добро пожаловать в зону с доступом по статусу '${cfg.requiredStatus}'.`);
                } else {
                    gameApi.sendChatMessage(player.id, utils.formatString(config.texts.statusRequired, { statusName: cfg.requiredStatus }));
                    const spawnPos = gameApi.getSpawnPosition(); // Пример
                    gameApi.teleportPlayer(player.id, spawnPos);
                }
            },
            requiredStatus: cfg.requiredStatus,
            type: "access"
        }, gameApi);
    });

    // Зоны телепортации по координатам
    config.teleportZones.forEach(cfg => {
        const coords = utils.split(cfg.name, "@");
        if (coords.length === 3 && utils.isNumber(parseFloat(coords[0])) && utils.isNumber(parseFloat(coords[1])) && utils.isNumber(parseFloat(coords[2]))) {
            this.createZone({
                name: cfg.name,
                tag: cfg.tag,
                position: { x: 0, y: 0, z: 0, width: 10, height: 10, depth: 10 }, // TODO: Задать реальные координаты
                callback: (player) => {
                    const x = parseFloat(coords[0]);
                    const y = parseFloat(coords[1]);
                    const z = parseFloat(coords[2]);
                    gameApi.teleportPlayer(player.id, { x: x, y: y, z: z });
                    gameApi.sendChatMessage(player.id, utils.formatString(config.texts.playerTeleported, { coords: cfg.name }));
                },
                type: "teleport"
            }, gameApi);
        }
    });
};

// Проверка, находится ли игрок в какой-либо зоне
// Эта функция должна вызываться при каждом движении игрока
Zones.checkPlayerInZones = function(player, gameApi) {
    if (!player) return;

    const playerPos = gameApi.getPlayerPosition(player.id); // Предполагаемая функция API
    if (!playerPos) return;

    for (const zone of this.activeZones) {
        // TODO: Реализовать точную проверку нахождения игрока в пределах зоны
        // Это может быть проверка расстояния или использование API, если есть такая функция
        // Пример простой проверки (предполагает, что position содержит x, y, z, width, height, depth)
        const pos = zone.position;
        if (playerPos.x >= pos.x - pos.width / 2 && playerPos.x <= pos.x + pos.width / 2 &&
            playerPos.y >= pos.y - pos.height / 2 && playerPos.y <= pos.y + pos.height / 2 &&
            playerPos.z >= pos.z - pos.depth / 2 && playerPos.z <= pos.z + pos.depth / 2)
        {
            // Игрок вошел в зону
            if (zone.requiredStatus && player.status !== zone.requiredStatus) {
                // Необходим статус, но у игрока его нет
                gameApi.sendChatMessage(player.id, utils.formatString(config.texts.statusRequired, { statusName: zone.requiredStatus }));
                const spawnPos = gameApi.getSpawnPosition();
                gameApi.teleportPlayer(player.id, spawnPos);
            } else {
                // Выполнение колбэка зоны
                zone.callback(player, gameApi);
            }
            return zone; // Предполагаем, что игрок может быть только в одной зоне одновременно
        }
    }
    return null; // Игрок не в зоне
};

module.exports = Zones;
