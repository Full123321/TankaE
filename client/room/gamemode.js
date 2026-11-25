// gamemode.js
const API = require("pixel-combats-api"); // см. официальный API

// ============ ХРАНИЛИЩЕ ============

const state = {
  serverStart: Date.now(),
  players: new Map(),   // roomId -> playerData
  nextId: 1,
  rainbowIndex: 0,
  hintToggle: false,
};

const RAINBOW = ["#FF0000","#FF7F00","#FFFF00","#00FF00","#00BFFF","#4B0082","#8B00FF"];

// ============ УТИЛИТЫ ============

function getPlayerById(roomId) {
  return [...state.players.values()].find(p => p.roomId === roomId && p.alive);
}

function getPlayerData(player) {
  return [...state.players.values()].find(p => p.uuid === player.uuid);
}

function parseCoords(str) {
  const [x, y, z] = str.split("@").map(Number);
  return { x, y, z };
}

function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

// ============ ЖИЗНЕННЫЙ ЦИКЛ ИГРОКА ============

API.on("player_join", (player) => {
  const id = state.nextId++;
  const data = {
    uuid: player.uuid,
    nickname: player.nickname,
    roomId: id,
    alive: true,
    coins: 0,
    kills: 0,
    isAdmin: id === 1,     // первому — админ
    status: { name: "", color: "" },
    ownedStatuses: [],
    cooldowns: {},
    isFlying: id === 1,
  };
  state.players.set(player.uuid, data);

  // Первому — админ: полёт, все оружия, бесконечные
  if (data.isAdmin) {
    giveAdminKit(player);
  }

  // HUD
  attachHud(player, data);
  updateAllHud();
});

API.on("player_leave", (player) => {
  const data = state.players.get(player.uuid);
  if (data) {
    data.alive = false;
    // ID оставляем занятым, чтобы не путать
  }
  updateAllHud();
});

API.on("player_death", (killer, victim) => {
  const kd = getPlayerData(killer);
  if (kd) { kd.kills++; updateAllHud(); }
});

// ============ АДМИНСКИЙ НАБОР ============

function giveAdminKit(player) {
  API.giveAllWeapons(player, { infinite: true });      // все оружия беск
  API.giveAllBuildingBlocks(player, { infinite: true });
  API.setFlight(player, true);
  player.showHint("👑 Вы АДМИН!");
}

// ============ ЗОНЫ ============

API.on("zone_enter", (player, zone) => {
  const data = getPlayerData(player);
  if (!data) return;

  const tag = (zone.tag || "").toLowerCase();
  const name = zone.name || "";

  switch (tag) {
    case "farm":      handleFarm(player, data, name, zone); break;
    case "weapon":    handleWeapon(player, data, name);     break;
    case "xp":        handleHp(player, data, name);         break;
    case "hint":      player.showHint(name);                break;
    case "tp":        handleTp(player, name);               break;
    case "status":    handleStatusBuy(player, data, name);  break;
    case "status2":   handleStatusDoor(player, data, name); break;
    case "plata1":    player.showHint("Введите /pay <ID> <сумма>"); break;
    case "plata2":    player.showHint("Введите /payid <ID> затем /pay"); break;
    case "plata3":    player.showHint("Подтвердите /confirmpay"); break;
  }
});

// ----- FARM -----
function handleFarm(player, data, name, zone) {
  const amount = parseInt(name, 10);
  if (isNaN(amount)) return;

  const key = "farm_" + zone.id;
  const now = Date.now();
  if (data.cooldowns[key] && now - data.cooldowns[key] < 2000) return;
  data.cooldowns[key] = now;

  data.coins += amount;
  player.showHint(`+${amount} монет (Всего: ${data.coins})`);
  updateAllHud();
}

// ----- WEAPON -----
// "0@100" — слот@цена
function handleWeapon(player, data, name) {
  const [slotStr, priceStr] = name.split("@");
  const slot = parseInt(slotStr, 10);
  const price = parseInt(priceStr, 10);
  if (isNaN(slot) || isNaN(price)) return;

  if (data.coins < price) {
    player.showHint("❌ Недостаточно средств");
    return;
  }
  data.coins -= price;
  giveWeaponBySlot(player, slot);
  player.showHint(`Куплено оружие слота ${slot} за ${price}`);
  updateAllHud();
}

function giveWeaponBySlot(player, slot) {
  const map = {
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
  const c = map[slot];
  if (c) API.giveWeapon(player, c.item, { infinite: c.infinite });
}

// ----- HP -----
// "100@500" — hp@цена
function handleHp(player, data, name) {
  const [hpStr, priceStr] = name.split("@");
  const hp = parseInt(hpStr, 10);
  const price = parseInt(priceStr, 10);
  if (isNaN(hp) || isNaN(price)) return;

  if (data.coins < price) { player.showHint("❌ Недостаточно средств"); return; }
  data.coins -= price;
  API.setHealth(player, hp);
  player.showHint(`+${hp} HP за ${price}`);
  updateAllHud();
}

// ----- TP -----
// "10@20@30"
function handleTp(player, name) {
  const [x, y, z] = name.split("@").map(Number);
  if ([x,y,z].some(isNaN)) return;
  API.teleport(player, { x, y, z });
}

// ----- STATUS BUY -----
// "red@vip@100"
function handleStatusBuy(player, data, name) {
  const parts = name.split("@");
  if (parts.length < 2) return;
  const color = parts[0];
  const statusName = parts[1];
  const price = parts.length >= 3 ? parseInt(parts[2], 10) || 0 : 0;

  if (data.ownedStatuses.includes(statusName)) return;
  if (data.coins < price) { player.showHint("❌ Недостаточно средств"); return; }

  data.coins -= price;
  data.ownedStatuses.push(statusName);
  data.status = { name: statusName, color };
  player.showHint(`✅ Статус ${statusName} куплен!`);
  updateAllHud();
}

// ----- STATUS DOOR -----
// "red@vip" — только с vip
function handleStatusDoor(player, data, name) {
  const parts = name.split("@");
  if (parts.length < 2) return;
  const required = parts[1];
  if (!data.ownedStatuses.includes(required)) {
    API.teleport(player, API.getSpawnPoint());
    player.showHint(`🔒 Нужен статус: ${required}`);
  }
}

// ============ ЧАТ-КОМАНДЫ ============

API.on("chat", (player, text) => {
  if (!text.startsWith("/")) return;
  const data = getPlayerData(player);
  if (!data) return;

  const args = text.trim().split(/\s+/);
  const cmd = args[0].toLowerCase();

  switch (cmd) {
    case "/help":
      player.sendMessage([
        "/tp <ID> — телепорт к игроку",
        "/spawn <ID> — на спавн",
        "/pop <текст> — сообщение всем",
        "/adm <ID> — выдать админку (админ)",
        "/ban <ID> — кик/бан (админ)",
        "/pay <ID> <сумма> — перевод",
        "/myid — мой ID",
      ].join("\n"));
      break;

    case "/myid":
      player.sendMessage(`Ваш ID: ${data.roomId}`);
      break;

    case "/tp": {
      const id = parseInt(args[1], 10);
      const target = getPlayerById(id);
      if (!target) { player.sendMessage("Игрок не найден"); return; }
      API.teleport(player, target.position);
      player.sendMessage(`ТП к #${id}`);
      break;
    }

    case "/spawn": {
      const id = parseInt(args[1], 10);
      if (data.roomId === id) {
        API.teleport(player, API.getSpawnPoint());
      } else if (data.isAdmin) {
        const t = getPlayerById(id);
        if (t) API.teleport(t.player, API.getSpawnPoint());
      }
      break;
    }

    case "/pop": {
      const msg = text.substring(4).trim();
      API.getAllPlayers().forEach(p => p.showHint(msg));
      break;
    }

    case "/adm": {
      if (!data.isAdmin) { player.sendMessage("🚫 Только админ"); return; }
      const t = getPlayerById(parseInt(args[1], 10));
      if (t && !t.isAdmin) {
        t.isAdmin = true;
        API.sendMessage(t.player, "Вам выдана админка");
        giveAdminKit(t.player);
      }
      break;
    }

    case "/ban": {
      if (!data.isAdmin) { player.sendMessage("🚫 Только админ"); return; }
      const t = getPlayerById(parseInt(args[1], 10));
      if (t) {
        t.alive = false;
        API.kick(t.player, "Забанен админом");
        updateAllHud();
      }
      break;
    }

    case "/pay": {
      const id = parseInt(args[1], 10);
      const amt = parseInt(args[2], 10);
      if (isNaN(id) || isNaN(amt) || amt <= 0) return;
      if (data.coins < amt) { player.showHint("❌ Недостаточно средств"); return; }
      const t = getPlayerById(id);
      if (!t) { player.showHint("Игрок не найден"); return; }
      data.coins -= amt;
      t.coins += amt;
      API.sendMessage(t.player, `💰 Вам переведено ${amt} от #${data.roomId}`);
      player.showHint(`Переведено ${amt} игроку #${id}`);
      updateAllHud();
      break;
    }

    case "/giveall": {
      if (!data.isAdmin) return;
      giveAdminKit(player);
      player.showHint("Всё выдано");
      break;
    }
  }
});

// ============ HUD ============

function attachHud(player, data) {
  // Левый верх + правый верх + таблица
  API.setTopLeft(player, "");
  API.setTopRight(player, "");
  API.setScoreboard(player, "");
}

function updateAllHud() {
  const time = fmtTime(Date.now() - state.serverStart);

  // Радужная надпись меняется раз в 20 сек
  state.hintToggle = (Math.floor((Date.now() - state.serverStart) / 20000) % 2) === 1;
  const leftText = state.hintToggle
    ? "<b>/help - тут все команды, долбоёбы!</b>"
    : "<b>режим от тяночки!</b>";
  const color = RAINBOW[state.rainbowIndex % RAINBOW.length];

  // Заголовки таблицы по правкам:
  // статусы / рум айди / монеты / убийства
  const rows = [...state.players.values()]
    .filter(p => p.alive)
    .sort((a, b) => a.roomId - b.roomId)
    .map(p =>
      `${p.roomId} | ${p.nickname} | ${p.status.name || "-"} | ${p.roomId} | ${p.coins} | ${p.kills}`
    );

  const table = [
    "статусы | рум айди | монеты | убийства",
    ...rows
  ].join("\n");

  API.getAllPlayers().forEach(p => {
    API.setTopLeft(p, `<color=${color}>${leftText}</color>`);
    API.setTopRight(p, `Server Time\n${time}`);
    API.setScoreboard(p, table);
  });

  state.rainbowIndex++;
}

// ============ ТИКЕР ============

setInterval(() => {
  updateAllHud();
}, 1000);
