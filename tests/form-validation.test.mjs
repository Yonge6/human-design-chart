import assert from "node:assert/strict";
import test from "node:test";

import { applyAmPmSelection, validateBirthSelection } from "../src/app/form-validation.js";

const validInput = {
  year: "2000",
  month: "02",
  day: "29",
  hour: "12",
  minute: "00",
  ampm: "am",
};

function createAmPmControls() {
  const hiddenInput = { value: "" };
  const buttons = ["am", "pm"].map((ampm) => {
    const attributes = new Map([["aria-pressed", "false"]]);
    return {
      dataset: { ampm },
      getAttribute(name) { return attributes.get(name) ?? null; },
      setAttribute(name, value) { attributes.set(name, String(value)); },
    };
  });
  return { hiddenInput, buttons };
}

test("birth validation accepts leap dates and converts the 12-hour clock", () => {
  const midnight = validateBirthSelection(validInput);
  const afternoon = validateBirthSelection({ ...validInput, hour: "01", minute: "07", ampm: "pm" });

  assert.equal(midnight.valid, true);
  assert.equal(midnight.value.hour24, 0);
  assert.equal(afternoon.valid, true);
  assert.equal(afternoon.value.hour24, 13);
  assert.equal(afternoon.value.minute, 7);
});

test("birth validation rejects missing date and time fields", () => {
  assert.deepEqual(validateBirthSelection({ ...validInput, year: "" }), { valid: false, code: "selectDate", field: "year" });
  assert.deepEqual(validateBirthSelection({ ...validInput, day: "" }), { valid: false, code: "selectDate", field: "day" });
  assert.deepEqual(validateBirthSelection({ ...validInput, hour: "" }), { valid: false, code: "selectTime", field: "hour" });
  assert.deepEqual(validateBirthSelection({ ...validInput, minute: "" }), { valid: false, code: "selectTime", field: "minute" });
  assert.deepEqual(validateBirthSelection({ ...validInput, ampm: "" }), { valid: false, code: "selectAmPm", field: "ampm" });
});

test("birth validation rejects impossible Gregorian dates", () => {
  assert.deepEqual(validateBirthSelection({ ...validInput, year: "2001", day: "29" }), { valid: false, code: "invalidDate", field: "day" });
  assert.deepEqual(validateBirthSelection({ ...validInput, month: "04", day: "31" }), { valid: false, code: "invalidDate", field: "day" });
  assert.deepEqual(validateBirthSelection({ ...validInput, month: "13" }), { valid: false, code: "invalidDate", field: "day" });
});

test("birth validation rejects out-of-range clock values", () => {
  assert.deepEqual(validateBirthSelection({ ...validInput, hour: "13" }), { valid: false, code: "invalidTime", field: "hour" });
  assert.deepEqual(validateBirthSelection({ ...validInput, minute: "60" }), { valid: false, code: "invalidTime", field: "minute" });
});

test("real initial AM/PM control state fails submission until explicitly selected", () => {
  const { hiddenInput, buttons } = createAmPmControls();
  applyAmPmSelection(hiddenInput, buttons, "");

  assert.equal(hiddenInput.value, "");
  assert.deepEqual(buttons.map((button) => button.getAttribute("aria-pressed")), ["false", "false"]);
  assert.deepEqual(
    validateBirthSelection({ ...validInput, ampm: hiddenInput.value }),
    { valid: false, code: "selectAmPm", field: "ampm" },
  );
});

test("explicit AM and PM selections both validate", () => {
  const { hiddenInput, buttons } = createAmPmControls();

  applyAmPmSelection(hiddenInput, buttons, "am");
  assert.equal(validateBirthSelection({ ...validInput, ampm: hiddenInput.value }).valid, true);
  assert.deepEqual(buttons.map((button) => button.getAttribute("aria-pressed")), ["true", "false"]);

  applyAmPmSelection(hiddenInput, buttons, "pm");
  assert.equal(validateBirthSelection({ ...validInput, ampm: hiddenInput.value }).valid, true);
  assert.deepEqual(buttons.map((button) => button.getAttribute("aria-pressed")), ["false", "true"]);
});

test("history hydration restores its recorded AM or PM without guessing", () => {
  const { hiddenInput, buttons } = createAmPmControls();

  applyAmPmSelection(hiddenInput, buttons, "pm");
  assert.equal(hiddenInput.value, "pm");
  assert.deepEqual(buttons.map((button) => button.getAttribute("aria-pressed")), ["false", "true"]);

  applyAmPmSelection(hiddenInput, buttons, "am");
  assert.equal(hiddenInput.value, "am");
  assert.deepEqual(buttons.map((button) => button.getAttribute("aria-pressed")), ["true", "false"]);

  applyAmPmSelection(hiddenInput, buttons, undefined);
  assert.equal(hiddenInput.value, "");
  assert.deepEqual(buttons.map((button) => button.getAttribute("aria-pressed")), ["false", "false"]);
});
