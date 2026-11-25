// utils.js

const utils = {
    // Проверка, является ли значение числом
    isNumber: function(value) {
        return typeof value === 'number' && isFinite(value);
    },

    // Разделение строки по разделителю
    split: function(str, sep) {
        if (!str) return [];
        return str.split(sep);
    },

    // Парсинг имени зоны для получения числовых значений
    parseZoneValue: function(zoneName) {
        const match = zoneName.match(/^(\d+)/);
        if (match && match[1]) {
            return parseInt(match[1], 10);
        }
        return null;
    },

    // Парсинг имени зоны для получения двух числовых значений (например, 100@500)
    parseZoneValuesDouble: function(zoneName) {
        const parts = zoneName.split("@");
        if (parts.length === 2) {
            const val1 = parseFloat(parts[0]);
            const val2 = parseFloat(parts[1]);
            if (this.isNumber(val1) && this.isNumber(val2)) {
                return val1, val2;
            }
        }
        return null, null;
    },

    // Парсинг имени зоны для статусов (например, red@vip@100)
    parseStatusZone: function(zoneName) {
        const parts = zoneName.split("@");
        if (parts.length === 3) {
            const color = parts[0];
            const statusName = parts[1];
            const price = parseFloat(parts[2]);
            if (color && statusName && this.isNumber(price)) {
                return color, statusName, price;
            }
        }
        return null, null, null;
    },

    // Форматирование строк с подстановкой значений
    formatString: function(str, replacements) {
        let formatted = str;
        for (const key in replacements) {
            const placeholder = `{${key}}`;
            formatted = formatted.replace(new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), replacements[key]);
        }
        return formatted;
    },

    // Глубокое копирование объекта
    deepCopy: function(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
};

module.exports = utils;
