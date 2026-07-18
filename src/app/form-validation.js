const integerPattern = /^\d+$/;

function parseInteger(value) {
  const text = String(value ?? "").trim();
  return integerPattern.test(text) ? Number(text) : Number.NaN;
}

export function validateBirthSelection(input) {
  const year = parseInteger(input.year);
  const month = parseInteger(input.month);
  const day = parseInteger(input.day);
  const hour = parseInteger(input.hour);
  const minute = parseInteger(input.minute);
  const ampm = input.ampm === "pm" ? "pm" : input.ampm === "am" ? "am" : "";

  if (!Number.isInteger(year)) return { valid: false, code: "selectDate", field: "year" };
  if (!Number.isInteger(month)) return { valid: false, code: "selectDate", field: "month" };
  if (!Number.isInteger(day)) return { valid: false, code: "selectDate", field: "day" };
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
    return { valid: false, code: "invalidDate", field: "day" };
  }

  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year
    || calendarDate.getUTCMonth() !== month - 1
    || calendarDate.getUTCDate() !== day
  ) {
    return { valid: false, code: "invalidDate", field: "day" };
  }

  if (!Number.isInteger(hour)) return { valid: false, code: "selectTime", field: "hour" };
  if (!Number.isInteger(minute)) return { valid: false, code: "selectTime", field: "minute" };
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
    return { valid: false, code: "invalidTime", field: hour < 1 || hour > 12 ? "hour" : "minute" };
  }
  if (!ampm) return { valid: false, code: "selectAmPm", field: "ampm" };

  const hour24 = (hour % 12) + (ampm === "pm" ? 12 : 0);
  return {
    valid: true,
    value: { year, month, day, hour, minute, hour24, ampm },
  };
}

export function applyAmPmSelection(hiddenInput, buttons, value) {
  const selection = value === "am" || value === "pm" ? value : "";
  hiddenInput.value = selection;
  buttons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.ampm === selection));
  });
  return selection;
}
