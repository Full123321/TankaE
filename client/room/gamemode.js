let players = {}; // Хранилище данных игроков: { uuid: { player, roomId, nickname, coins, isAdmin, alive, isFlying, status, ownedStatuses, ... }, ... }
let pendingPayment = null; // { from: playerData, to: playerData, amount: number }

// --- Функции для работы с данными игроков ---

function getPlayerDataByUuid(uuid) {
  return players[uuid];
}

function getPlayerDataById(id) {
  for (const uuid in players) {
    if (players[uuid].roomId == id) {
      return players[uuid];
    }
  }
  return null;
}

function getPlayerDataByName(name) {
  for (const uuid in players) {
    if (players[uuid].nickname.toLowerCase() === name.toLowerCase()) {
      return players[uuid];
    }
  }
  return null;
}

function updatePlayerHud(player) {
  if (!player) return;
  const playerData = getPlayerDataByUuid(player.uuid);
  if (!playerData || !playerData.alive) return;

  const health = API.getHealth(player);
  const maxHealth = 100;
  const armor = API.getArmor(player);
  const maxArmor = 100;

  let hudText = `\n<color=#77DD77>HP: ${health}/${maxHealth}</color> | <color=#FFD700>ARM: ${armor}/${maxArmor}</color>`;
  hudText += `\n<color=#ADD8E6>Coins: ${playerData.coins}</color>`;
  if (playerData.status && playerData.status.name) {
    hudText += ` | <color=${playerData.status.color}>${playerData.status.name}</color>`;
  }

  API.setTopLeft(player, hudText);
}

function updateScoreboard() {
  const sortedPlayers = Object.values(players)
    .filter(pData => pData.alive)
    .sort((a, b) => b.coins - a.coins);

  let scoreboardText = "<b>--- ЛИДЕРЫ ---</b>\n";
  sortedPlayers.slice(0, 10).forEach((pData, index) => {
    scoreboardText += `${index + 1}. ${pData.nickname} (${pData.coins})\n`;
  });

  API.getAllPlayers().forEach(p => {
    const pData = getPlayerDataByUuid(p.uuid);
    if (pData && pData.alive) {
      API.setScoreboard(p, scoreboardText);
    }
  });
}

function updatePlayer(player, playerData) {
  playerData.player = player;
  playerData.roomId = player.id;
  playerData.nickname = player.name;
  playerData.alive = player.isConnected && API.isPlayerAlive(player);
  playerData.isFlying = API.isPlayerFlying(player);
  updatePlayerHud(player);
}

function setPlayerStatus(playerData, statusName, statusColor) {
  playerData.status = { name: statusName, color: statusColor };
  if (!playerData.ownedStatuses.includes(statusName)) {
    playerData.ownedStatuses.push(statusName);
  }
  updatePlayerHud(playerData.player);
}

function grantAdminPrivileges(player, playerData) {
  playerData.isAdmin = true;
  API.setPlayerTeam(player, API.getTeamByName("Admin"));
  player.showHint("Вам выданы права администратора.");
}

function revokeAdminPrivileges(player, playerData) {
  playerData.isAdmin = false;
  API.setPlayerTeam(player, API.getTeamByName("Default"));
  if (playerData.isFlying) {
    API.setFlight(player, false);
    playerData.isFlying = false;
  }
  player.showHint("У вас отобраны права администратора.");
}

// --- Обработчики событий API ---

API.onPlayerJoin = (player) => {
  const uuid = player.uuid;
  if (!players[uuid]) {
    players[uuid] = {
      uuid: uuid,
      player: player,
      roomId: player.id,
      nickname: player.name,
      coins: 100,
      isAdmin: false,
      alive: true,
      isFlying: false,
      status: { name: null, color: null },
      ownedStatuses: [],
    };
  } else {
    players[uuid].player = player;
    players[uuid].roomId = player.id;
    players[uuid].nickname = player.name;
    players[uuid].alive = true;
    players[uuid].isFlying = API.isPlayerFlying(player);
  }

  const playerData = players[uuid];
  setupPlayerHud(player, playerData);
  updatePlayerHud(player);
  updateScoreboard();
};

API.onPlayerLeave = (player) => {
  const playerData = getPlayerDataByUuid(player.uuid);
  if (playerData) {
    playerData.alive = false;
    playerData.player = null;
  }
  updateScoreboard();
};

API.onPlayerSpawn = (player) => {
  const playerData = getPlayerDataByUuid(player.uuid);
  if (playerData) {
    playerData.alive = true;
    playerData.isFlying = false;
    API.setFlight(player, false);
    updatePlayerHud(player);
    updateScoreboard();
  }
};

API.onPlayerDamage = (player, attacker, damage, type) => {
  const playerData = getPlayerDataByUuid(player.uuid);
  if (playerData && !playerData.alive) return;

  if (!attacker) {
    if (playerData) {
      playerData.alive = false;
      API.setHealth(player, 0);
    }
  }
};

API.onPlayerChat = (player, message) => {
  const playerData = getPlayerDataByUuid(player.uuid);
  if (!playerData || !playerData.alive) return false;

  if (message.startsWith("/")) {
    const [command, ...params] = message.substring(1).split(" ");
    const commandHandler = commandHandlers[command.toLowerCase()];
    if (commandHandler) {
      commandHandler(player, playerData, params);
      return false;
    }
  }

  updatePlayerHud(player);
  return true;
};

// --- Инициализация ---

function initializeServer() {
  API.getAllPlayers().forEach(player => {
    API.onPlayerJoin(player);
  });
  setInterval(updateScoreboard, 5000);
}

// --- Команды ---

const commandHandlers = {
  "spawn": handleSpawnCommand,
  "tp": handleTpCommand,
  "pay": handlePayCommand,
  "confirmpay": handleConfirmPayCommand,
  "status": handleStatusCommand,
  "give": handleGiveCommand,
  "fly": handleFlyCommand,
  "heal": handleHealCommand,
  "weapon": handleWeaponCommand,
  "reload": handleReloadCommand,
  "pop": handlePopCommand,
  "ban": handleBanCommand,
  "admin": handleAdminCommand,
};

function handleTpCommand(player, playerData, params) {
  if (!playerData.alive) { player.sendMessage("Вы мертвы."); return; }
  if (params.length === 0) { player.sendMessage("Используйте: /tp <ID>"); return; }

  const targetId = parseInt(params[0], 10);
  const targetData = getPlayerDataById(targetId);

  if (!targetData) { player.sendMessage(`Игрок с ID ${targetId} не найден.`); return; }
  if (!targetData.alive) { player.sendMessage(`Игрок ${targetData.nickname} не в игре.`); return; }

  API.teleport(player, targetData.player.position);
  player.sendMessage(`Вы телепортировались к игроку ${targetData.nickname} (#${targetId}).`);
}

function handleSpawnCommand(player, playerData, params) {
  if (!playerData.alive) { player.sendMessage("Вы мертвы."); return; }

  const targetIdParam = params[0];
  if (!targetIdParam) {
    API.teleport(player, API.getSpawnPoint());
    if (playerData.isFlying) {
      playerData.isFlying = false;
      API.setFlight(player, false);
    }
    player.sendMessage("Вы вернулись на спавн.");
  } else if (playerData.isAdmin) {
    const targetId = parseInt(targetIdParam, 10);
    const targetData = getPlayerDataById(targetId);
    if (!targetData) { player.sendMessage(`Игрок с ID ${targetId} не найден.`); return; }

    API.teleport(targetData.player, API.getSpawnPoint());
    if (targetData.isFlying) {
      targetData.isFlying = false;
      API.setFlight(targetData.player, false);
    }
    player.sendMessage(`Игрок ${targetData.nickname} (#${targetId}) отправлен на спавн.`);
  } else {
    player.sendMessage("Только админы могут телепортировать других.");
  }
}

function handlePopCommand(player, playerData, params) {
  if (!playerData.isAdmin) { player.sendMessage("Только для админов."); return; }
  if (params.length === 0) { player.sendMessage("Используйте: /pop <текст>"); return; }
  const message = params.join(" ");
  API.getAllPlayers().forEach(p => {
    const pData = getPlayerDataByUuid(p.uuid);
    if (pData && pData.alive) {
      p.showHint(`<color=#FFA500><b>[Внимание]</b></color> ${message}`);
    }
  });
}

function handleAdminCommand(player, playerData, params) {
  if (!playerData.isAdmin) { player.sendMessage("Только для админов."); return; }
  if (params.length === 0) { player.sendMessage("Используйте: /admin <ID>"); return; }

  const targetId = parseInt(params[0], 10);
  const targetData = getPlayerDataById(targetId);

  if (!targetData) { player.sendMessage(`Игрок с ID ${targetId} не найден.`); return; }

  if (targetData.isAdmin) {
    revokeAdminPrivileges(targetData.player, targetData);
    player.sendMessage(`Админка у игрока ${targetData.nickname} (#${targetId}) отозвана.`);
  } else {
    grantAdminPrivileges(targetData.player, targetData);
    player.sendMessage(`Админка выдана игроку ${targetData.nickname} (#${targetId}).`);
  }
  updateScoreboard();
}

function handleBanCommand(player, playerData, params) {
  if (!playerData.isAdmin) { player.sendMessage("Только для админов."); return; }
  if (params.length === 0) { player.sendMessage("Используйте: /ban <ID> [причина]"); return; }

  const targetId = parseInt(params[0], 10);
  const targetData = getPlayerDataById(targetId);

  if (!targetData) { player.sendMessage(`Игрок с ID ${targetId} не найден.`); return; }
  if (targetData.isAdmin && !playerData.isAdmin) {
     player.sendMessage("Вы не можете забанить другого админа."); return;
  }

  const reason = params.slice(1).join(" ") || "Причина не указана";
  API.kick(targetData.player, `Забанен: ${reason}`);
  targetData.alive = false;
  targetData.isFlying = false;
  API.setFlight(targetData.player, false);
  player.sendMessage(`Игрок ${targetData.nickname} (#${targetId}) забанен. Причина: ${reason}`);
  updateScoreboard();
}

function handlePayCommand(player, playerData, params) {
  if (!playerData.alive) { player.sendMessage("Вы мертвы."); return; }
  if (params.length < 2) { player.sendMessage("Используйте: /pay <ID> <сумма>"); return; }

  const targetId = parseInt(params[0], 10);
  const amount = parseInt(params[1], 10);

  if (isNaN(targetId) || isNaN(amount) || amount <= 0) {
    player.sendMessage("Неверный ID или сумма.");
    return;
  }

  const targetData = getPlayerDataById(targetId);
  if (!targetData) { player.sendMessage(`Игрок с ID ${targetId} не найден.`); return; }
  if (targetData.uuid === playerData.uuid) { player.sendMessage("Вы не можете переводить монеты самому себе."); return; }
  if (playerData.coins < amount) { player.sendMessage(`Недостаточно ${amount} монет. У вас: ${playerData.coins}.`); return; }

  pendingPayment = { from: playerData, to: targetData, amount: amount };
  player.sendMessage(`Вы собираетесь перевести ${targetData.nickname} (#${targetId}) ${amount} монет. Подтвердите командой /confirmpay.`);
  targetData.player.showHint(`Игрок #${playerData.roomId} хочет перевести вам ${amount} монет. Используйте /confirmpay для подтверждения.`);
}

function handleConfirmPayCommand(player, playerData, params) {
  if (!pendingPayment) { player.sendMessage("Нет ожидающих платежей для подтверждения."); return; }
  if (pendingPayment.to.uuid !== playerData.uuid) { player.sendMessage("Вы не являетесь получателем этого платежа."); return; }

  const { from, to, amount } = pendingPayment;
  const senderData = getPlayerDataByUuid(from.uuid);

  if (!senderData || senderData.coins < amount) {
    player.sendMessage(`Платеж не удался. У отправителя (${senderData?.nickname || 'игрок'}) недостаточно монет.`);
    if (senderData && senderData.uuid !== playerData.uuid) {
       senderData.player.showHint(`Ваш перевод (${amount} монет) не прошел, так как у вас недостаточно средств.`);
    }
    pendingPayment = null;
    return;
  }

  senderData.coins -= amount;
  to.coins += amount;

  player.sendMessage(`Вы успешно перевели ${amount} монет ${to.nickname} (#${to.roomId}).`);
  to.player.sendMessage(`Игрок ${senderData.nickname} (#${senderData.roomId}) перевел вам ${amount} монет.`);

  updatePlayerHud(player);
  updatePlayerHud(to.player);
  updateScoreboard();
  pendingPayment = null;
}

function handleGiveCommand(player, playerData, params) {
  if (!playerData.isAdmin) { player.sendMessage("Только для админов."); return; }
  if (params.length < 3) { player.sendMessage("Используйте: /give <ID> <предмет> <кол-во>"); return; }

  const targetId = parseInt(params[0], 10);
  const itemName = params[1].toLowerCase();
  const amount = parseInt(params[2], 10);

  const targetData = getPlayerDataById(targetId);
  if (!targetData) { player.sendMessage(`Игрок с ID ${targetId} не найден.`); return; }
  if (isNaN(amount) || amount <= 0) { player.sendMessage("Неверное количество."); return; }

  if (itemName === "coins" || itemName === "монеты") {
    targetData.coins += amount;
    player.sendMessage(`Вы выдали ${targetData.nickname} (#${targetId}) ${amount} монет.`);
    targetData.player.showHint(`+${amount} монет от админа.`);
    updatePlayerHud(targetData.player);
    updateScoreboard();
  } else {
    const weapon = API.getWeaponByName(itemName);
    if (weapon) {
      API.giveWeapon(targetData.player, weapon, { amount: amount, infinite: false });
      player.sendMessage(`Вы выдали ${targetData.nickname} (#${targetId}) ${itemName} x${amount}.`);
    } else {
      player.sendMessage(`Неизвестный предмет: ${itemName}.`);
    }
  }
}

function handleStatusCommand(player, playerData, params) {
  if (params.length === 0) {
    player.sendMessage(`Ваш текущий статус: ${playerData.status.name || 'Нет'}`);
    player.sendMessage(`Купленные статусы: ${playerData.ownedStatuses.join(', ') || 'Нет'}`);
    return;
  }

  const statusColor = params[0];
  const statusName = params[1];

  if (playerData.isAdmin) {
    setPlayerStatus(playerData, statusName, statusColor);
    player.sendMessage(`Статус "${statusName}" установлен.`);
  } else {
    player.sendMessage("Для покупки статуса используйте зоны или админские команды.");
  }
}

function handleFlyCommand(player, playerData, params) {
  if (!playerData.isAdmin) { player.sendMessage("Только для админов."); return; }

  let targetPlayer = player;
  let targetData = playerData;
  let enableFlight = !playerData.isFlying;

  if (params.length > 0) {
    const targetId = parseInt(params[0], 10);
    if (!isNaN(targetId)) {
      const foundData = getPlayerDataById(targetId);
      if (foundData) {
        targetPlayer = foundData.player;
        targetData = foundData;
      } else {
        player.sendMessage(`Игрок с ID ${targetId} не найден.`);
        return;
      }
    }
    if (isNaN(targetId)) {
      const stateStr = params[0].toLowerCase();
      if (stateStr === "true" || stateStr === "on" || stateStr === "вкл") enableFlight = true;
      else if (stateStr === "false" || stateStr === "off" || stateStr === "выкл") enableFlight = false;
      else { player.sendMessage("Используйте: /fly [ID] [true/false]"); return; }
    } else {
       if (params.length > 1) {
         const stateStr = params[1].toLowerCase();
         if (stateStr === "true" || stateStr === "on" || stateStr === "вкл") enableFlight = true;
         else if (stateStr === "false" || stateStr === "off" || stateStr === "выкл") enableFlight = false;
         else { player.sendMessage("Используйте: /fly [ID] [true/false]"); return; }
       } else {
         enableFlight = !targetData.isFlying;
       }
    }
  }

  targetData.isFlying = enableFlight;
  API.setFlight(targetPlayer, enableFlight);
  player.sendMessage(`Полет для ${targetData.nickname} ${enableFlight ? 'включен' : 'выключен'}.`);
  if (targetData.uuid !== playerData.uuid) {
     targetPlayer.showHint(enableFlight ? "Админ включил вам полет!" : "Админ выключил вам полет.");
  }
}

function handleHealCommand(player, playerData, params) {
   if (!playerData.isAdmin) { player.sendMessage("Только для админов."); return; }
   if (params.length < 2) { player.sendMessage("Используйте: /heal <ID> <HP>"); return; }

   const targetId = parseInt(params[0], 10);
   const healAmount = parseInt(params[1], 10);

   const targetData = getPlayerDataById(targetId);
   if (!targetData) { player.sendMessage(`Игрок с ID ${targetId} не найден.`); return; }
   if (isNaN(healAmount) || healAmount <= 0) { player.sendMessage("Неверное количество HP."); return; }

   const currentHealth = API.getHealth(targetData.player);
   const maxHealth = 100;
   const newHealth = Math.min(currentHealth + healAmount, maxHealth);
   API.setHealth(targetData.player, newHealth);

   player.sendMessage(`Вылечили ${targetData.nickname} (#${targetId}) на ${newHealth - currentHealth} HP (всего ${newHealth}).`);
   targetData.player.showHint(`Вас вылечили на ${newHealth - currentHealth} HP.`);
}

function handleWeaponCommand(player, playerData, params) {
  if (!playerData.isAdmin) { player.sendMessage("Только для админов."); return; }
  if (params.length < 2) { player.sendMessage("Используйте: /weapon <ID> <слот> [infinite]"); return; }

  const targetId = parseInt(params[0], 10);
  const slot = parseInt(params[1], 10);
  const infinite = params.length > 2 && (params[2].toLowerCase() === "true" || params[2].toLowerCase() === "infinite");

  const targetData = getPlayerDataById(targetId);
  if (!targetData) { player.sendMessage(`Игрок с ID ${targetId} не найден.`); return; }
  if (isNaN(slot)) { player.sendMessage("Неверный слот."); return; }

  giveWeaponBySlot(targetData.player, slot, false);
  player.sendMessage(`Вы выдали игроку ${targetData.nickname} (#${targetId}) оружие слота ${slot} ${infinite ? '(бесконечное)' : ''}.`);
}

function handleReloadCommand(player, playerData) {
  updatePlayerHud(player);
  player.sendMessage("HUD обновлен.");
}

function giveWeaponBySlot(player, slot, isPurchase) {
  const weapons = {
    0: { item: "main",       infinite: false },
    1: { item: "secondary",  infinite: false },
    2: { item: "melee",      infinite: false },
    3: { item: "grenade",    infinite: false },
    4: { item: "blocks",     infinite: false },
    5: { item: "main",       infinite: true  },
    6: { item: "secondary",  infinite: true  },
    7: { item: "grenade",    infinite: true  },
    8: { item: "blocks",     infinite: true  },
  };

  const weaponInfo = weapons[slot];
  if (!weaponInfo) {
    player.showHint("Неверный слот оружия.");
    return;
  }

  const weaponName = weaponInfo.item;
  try {
    API.giveWeapon(player, weaponName, { infinite: weaponInfo.infinite });
    if (isPurchase) {
    } else if (getPlayerDataByUuid(player.uuid)?.isAdmin) {
       player.showHint(`Выдано оружие: ${weaponName} (${weaponInfo.infinite ? 'беск.' : 'обычн.'})`);
    }
  } catch (e) {
     console.error(`Ошибка выдачи оружия ${weaponName}:`, e);
     player.showHint("Ошибка при выдаче оружия.");
  }
}

function setupPlayerHud(player, playerData) {
  API.setTopLeft(player, "");
  API.setTopRight(player, "");
  API.setScoreboard(player, "");
}

initializeServer();
