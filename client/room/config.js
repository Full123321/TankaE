// config.js

const config = {
    // Настройки фарма
    farmZones: [
        { name: "100", tag: "farm", reward: 100 },
        { name: "200", tag: "farm", reward: 200 },
        { name: "300", tag: "farm", reward: 300 },
        { name: "400", tag: "farm", reward: 400 },
        { name: "500", tag: "farm", reward: 500 },
        // Добавьте другие значения по необходимости
    ],

    // Настройки покупок оружия
    shopWeapons: [
        { id: 0, name: "Основное оружие", tag: "weapon", price: 100 },
        { id: 1, name: "Вторичное оружие", tag: "weapon", price: 100 },
        { id: 2, name: "Ближнее оружие", tag: "weapon", price: 100 },
        { id: 3, name: "Гранаты", tag: "weapon", price: 100 },
        { id: 4, name: "Блоки", tag: "weapon", price: 100 },
        { id: 5, name: "Беск. основное", tag: "weapon", price: 500 }, // Пример цены
        { id: 6, name: "Беск. вторичное", tag: "weapon", price: 500 },
        { id: 7, name: "Беск. гранаты", tag: "weapon", price: 500 },
        { id: 8, name: "Беск. блоки", tag: "weapon", price: 500 },
        // Добавьте другие настройки оружия
    ],

    // Настройки покупки HP
    shopHp: [
        { amount: 100, price: 500 },
        { amount: 500, price: 2000 },
        // Можно добавить динамические цены или больше опций
    ],

    // Настройки передачи денег
    transferZones: [
        { name: "plata1", tag: "plata1", description: "Перевод денег" }
    ],

    // Настройки статусов
    statuses: [
        { color: "red", name: "vip", price: 100, tag: "status", type: "buy" },
        { color: "blue", name: "premium", price: 200, tag: "status", type: "buy" },
        // ... другие статусы
    ],

    // Зоны доступа по статусу
    statusAccessZones: [
        { name: "red@vip", tag: "status2", requiredStatus: "vip" },
        // ... другие зоны доступа
    ],

    // Зоны телепортации по координатам
    teleportZones: [
        { name: "10@20@30", tag: "tp", position: { x: 10, y: 20, z: 30 } },
        // ... другие зоны телепортации
    ],

    // Настройки команд
    commands: {
        tpPrefix: "/tp",
        popCommand: "/pop",
        spawnPrefix: "/spawn",
        adminPrefix: "/adm",
        banPrefix: "/ban",
        helpCommand: "/help",
        transferCommand: "/transfer" // Команда для передачи денег
    },

    // Тексты для отображения
    texts: {
        welcomeMessage: "Добро пожаловать на сервер {gamemodeName}! Ваш ID: {playerID}",
        notEnoughMoney: "Недостаточно монет.",
        receivedMoney: "Вы получили {amount} монет.",
        purchasedItem: "Вы купили {itemName} за {price} монет.",
        purchasedStatus: "Вы купили статус '{statusName}' за {price} монет.",
        teleportedToSpawn: "Вы телепортированы на спавн.",
        playerNotFound: "Игрок с ID {playerID} не найден.",
        noAdminRights: "У вас нет прав администратора.",
        playerBanned: "Вы забанили игрока {playerName}.",
        playerTeleportedToYou: "Игрок ID {targetID} телепортирован к вам.",
        playerTeleported: "Телепортация на координаты {coords}",
        accessDenied: "У вас нет доступа к этой зоне.",
        statusRequired: "Для входа требуется статус '{statusName}'.",
        hintMessage: ".", // Для hint зон
        serverStartTime: "Сервер работает: {time}",
        gamemodeTitle: "{gamemodeName}",
        helpCommand: "Доступные команды: /tp, /pop, /spawn, /adm, /ban, /transfer, /help дальше-больше!",
        transferHelp: "Использование: /transfer [ID игрока] [сумма]",
        transferSuccess: "Вы перевели {amount} монет игроку {playerName}.",
        transferNotEnoughFunds: "Недостаточно средств для перевода.",
        receivedTransfer: "Вы получили {amount} монет от игрока {senderName}.",
    }
};

module.exports = config;
