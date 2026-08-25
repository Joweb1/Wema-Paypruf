const ONES = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];

const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

const SCALES = ["", "thousand", "million", "billion", "trillion"];

function convertThreeDigits(num: number): string {
  let result = "";
  const hundreds = Math.floor(num / 100);
  const remainder = num % 100;

  if (hundreds > 0) {
    result += `${ONES[hundreds]} hundred`;
    if (remainder > 0) {
      result += " and ";
    }
  }

  if (remainder > 0) {
    if (remainder < 20) {
      result += ONES[remainder];
    } else {
      const ten = Math.floor(remainder / 10);
      const one = remainder % 10;
      result += TENS[ten];
      if (one > 0) {
        result += `-${ONES[one]}`;
      }
    }
  }

  return result;
}

/**
 * Converts any integer number to spoken English words.
 * Example: 10500 -> "ten thousand five hundred"
 */
export function numberToWords(num: number): string {
  if (isNaN(num)) return "zero";
  if (num === 0) return "zero";
  if (num < 0) return `negative ${numberToWords(Math.abs(num))}`;

  let current = Math.floor(num);
  const chunks: number[] = [];

  while (current > 0) {
    chunks.push(current % 1000);
    current = Math.floor(current / 1000);
  }

  const words: string[] = [];
  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i];
    if (chunk > 0) {
      const chunkText = convertThreeDigits(chunk);
      const scale = SCALES[i];
      if (scale) {
        words.push(`${chunkText} ${scale}`);
      } else {
        words.push(chunkText);
      }
    }
  }

  return words.join(" ").trim();
}

/**
 * Converts a currency amount (number or numeric string) into clear spoken Nigerian Naira and Kobo.
 * Example: 10500 -> "ten thousand five hundred naira"
 * Example: "250000.50" -> "two hundred and fifty thousand naira and fifty kobo"
 */
export function moneyToWords(amount: number | string, currency = "NGN"): string {
  const numericAmount =
    typeof amount === "string" ? parseFloat(amount.replace(/,/g, "")) : amount;

  if (isNaN(numericAmount) || numericAmount == null) {
    return "zero naira";
  }

  const isNaira =
    currency.toUpperCase() === "NGN" ||
    currency === "₦" ||
    currency.toUpperCase() === "NAIRA";

  const currencyUnit = isNaira ? "naira" : currency.toLowerCase();
  const subUnit = isNaira ? "kobo" : "cents";

  const absolute = Math.abs(numericAmount);
  const integerPart = Math.floor(absolute);
  const decimalPart = Math.round((absolute - integerPart) * 100);

  const integerWords = numberToWords(integerPart);
  let spokenResult = `${integerWords} ${currencyUnit}`;

  if (decimalPart > 0) {
    const decimalWords = numberToWords(decimalPart);
    spokenResult += ` and ${decimalWords} ${subUnit}`;
  }

  if (numericAmount < 0) {
    spokenResult = `negative ${spokenResult}`;
  }

  return spokenResult;
}

/**
 * Formats an amount for speech, replacing symbols like ₦ with words.
 */
export function formatAmountForSpeech(amount: number | string, currency = "NGN"): string {
  return moneyToWords(amount, currency);
}
