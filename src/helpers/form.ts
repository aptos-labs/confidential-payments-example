import { formatUnits, parseUnits } from 'ethers';
import * as Yup from 'yup';

/**
 * Common helper to get a yup schema for an amount field.
 */
export function getYupAmountField(
  yup: typeof Yup,
  decimals: number,
  totalBalanceBN: bigint,
  symbol: string,
) {
  const minAmount = formatUnits('1', decimals);
  const maxAmount = formatUnits(totalBalanceBN, decimals);

  return yup
    .string()
    .required('Enter amount')
    .test('isValidNumber', 'Enter a valid amount', value => {
      if (!value) return false;
      const num = Number(value);
      return !Number.isNaN(num) && Number.isFinite(num);
    })
    .test('minAmount', `Amount must be greater than ${minAmount} ${symbol}.`, value => {
      if (!value) return false;
      try {
        return parseUnits(value, decimals) >= 1n;
      } catch {
        return false;
      }
    })
    .test(
      'maxDecimals',
      `Amount cannot have more than ${decimals} decimal places.`,
      value => {
        if (!value) return true;
        const decimalIndex = value.indexOf('.');
        if (decimalIndex === -1) return true;
        return value.length - decimalIndex - 1 <= decimals;
      },
    )
    .test(
      'maxAmount',
      `Amount cannot be greater than current balance: ${maxAmount} ${symbol}.`,
      value => {
        if (!value) return false;
        try {
          return parseUnits(value, decimals) <= totalBalanceBN;
        } catch {
          return false;
        }
      },
    );
}
